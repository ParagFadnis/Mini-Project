const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const JWT_SECRET = "mysecretkey";

// 🗄️ MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/roleAuth")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));


// 📌 Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },   // ✅ ADD THIS
    password: String,
    role: String
});

const User = mongoose.model("User", userSchema);


// 📝 REGISTER
app.post("/register", async (req, res) => {
    const { username, email, password, role } = req.body;

    if (role === "admin") {
        return res.status(403).json({ message: "Admin cannot register" });
    }

    if (!["public", "volunteer"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            email,   // ✅ SAVE EMAIL
            password: hashedPassword,
            role
        });

        res.json({ message: "Registration successful 🎉" });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


// 🔐 LOGIN
app.post("/login", async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const user = await User.findOne({ username, role });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Wrong password" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, email:user.email },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ message: "Login successful", token });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


// 🛡️ Middleware
function authMiddleware(req, res, next) {
    const token = req.headers["authorization"];

    if (!token) {
        return res.status(401).json({ message: "No token" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}

// 📧 Email transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "paragfadnis2005@gmail.com",       // 🔁 replace
        pass: "dnbltelbrqknglxs"           // 🔁 replace
    }
});


// 🎯 Example Protected Route
app.get("/profile", authMiddleware, (req, res) => {
    res.json({
        message: "Protected data",
        user: req.user
    });
});

//Report Schema
const reportSchema = new mongoose.Schema({
    userId: String,
    description: String,
    image: String, // base64 for now
    location: String,
    status: { type: String, default: "Pending" }
});

const Report = mongoose.model("Report", reportSchema);

//Adoption Schema
const adoptionSchema = new mongoose.Schema({
    animalType: String,
    description: String,
    available: Boolean
});

const Adoption = mongoose.model("Adoption", adoptionSchema);

//report API
app.post("/report", authMiddleware, async (req, res) => {
    try {
        const { description, image, location } = req.body;

        // 🧠 Validate input
        if (!description || !image || !location) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // 🔍 Get user details (to fetch email)
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 💾 Create report
        const newReport = await Report.create({
            userId: req.user.id,
            description,
            image,
            location,
            status: "Pending"
        });

        // 📧 Send email to admin (non-blocking)
        sendEmail({
            description,
            location,
            status: "Pending"
        }, user.email).catch(err => console.log("Email error:", err));

        // ✅ Response
        res.json({ message: "Report submitted successfully 🐾" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});

//Get User Reports
app.get("/my-reports", authMiddleware, async (req, res) => {
    const reports = await Report.find({ userId: req.user.id });
    res.json(reports);
});



//Get Adoption Animals
app.get("/adoptions", async (req, res) => {
    const animals = await Adoption.find({ available: true });
    res.json(animals);
});

//Seed data(once)
app.get("/seed-adoption", async (req, res) => {
    await Adoption.create([
        { animalType: "Dog", description: "Friendly dog", available: true },
        { animalType: "Cat", description: "Cute cat", available: true },
        { animalType: "Cow", description: "Healthy cow", available: true }
    ]);

    res.send("Adoption data added");
});

//Admin Side

//Get Reports
app.get("/all-reports", authMiddleware, async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
    }

    const reports = await Report.find();
    res.json(reports);
});

//Update reports
app.put("/update-status/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.body;

    await Report.findByIdAndUpdate(req.params.id, { status });

    res.json({ message: "Status updated" });
});

//Animal Adoption
app.post("/add-adoption", authMiddleware, async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
    }

    const { animalType, description } = req.body;

    await Adoption.create({
        animalType,
        description,
        available: true
    });

    res.json({ message: "Animal added for adoption 🐾" });
});

//Volunteer

//Get reports
app.get("/available-reports", authMiddleware, async (req, res) => {
    const reports = await Report.find({ status: "Pending" });
    res.json(reports);
});

//Accept report
app.post("/accept-report/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== "volunteer") {
        return res.status(403).json({ message: "Access denied" });
    }

    await Report.findByIdAndUpdate(req.params.id, {
        status: "In Progress",
        assignedTo: req.user.id
    });

    res.json({ message: "Report accepted 🚑" });
});

//Update Progress
app.put("/complete-report/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== "volunteer") {
        return res.status(403).json({ message: "Access denied" });
    }

    await Report.findByIdAndUpdate(req.params.id, {
        status: "Resolved"
    });

    res.json({ message: "Report completed ✅" });
});


async function sendEmail(report, userEmail) {
    const mailOptions = {
        from: "paragfadnis2005@gmail.com",
        to: "fadnisruchir99@gmail.com",
        subject: "🚨 New Animal Report",
        html: `
            <h2>New Report 🐾</h2>
            <p><b>User Email:</b> ${userEmail}</p>
            <p><b>Description:</b> ${report.description}</p>
            <p><b>Location:</b> ${report.location}</p>
        `
    };

    await transporter.sendMail(mailOptions);
}

app.listen(8000, () => {
    console.log("Server running on port 8000");
});