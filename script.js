const BASE_URL = "http://localhost:8000";
const API = "http://localhost:8000";

// 🌍 Navigation
function goTo(page) {
    window.location.href = page;
}

// 🚪 Logout
function logout() {
    localStorage.removeItem("token");
    window.location.href = "home.html";
}

// Toggle Password Visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
}

// Password Strength Checker
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('regPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            const strengthBar = document.getElementById('strengthBar');
            
            let strength = 0;
            if (password.length >= 6) strength += 33;
            if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 33;
            if (password.match(/[0-9]/)) strength += 34;
            
            strengthBar.style.width = strength + '%';
            
            if (strength < 33) {
                strengthBar.style.background = '#ff4444';
            } else if (strength < 66) {
                strengthBar.style.background = '#ffaa00';
            } else {
                strengthBar.style.background = '#00C851';
            }
        });
    }

    // Animated counter for home page stats
    if (document.querySelector('.home-page')) {
        animateCounter('reportsCount', 1247);
        animateCounter('animalsCount', 856);
        animateCounter('volunteersCount', 342);
    }
});

// Animate Counter
function animateCounter(id, target) {
    const element = document.getElementById(id);
    if (!element) return;
    
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 30);
}

// 🔐 LOGIN
async function login() {
    const role = document.getElementById("role")?.value;
    const username = document.getElementById("username")?.value;
    const password = document.getElementById("password")?.value;

    if (!role || !username || !password) {
        showNotification("Please fill all fields", "error");
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ role, username, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem("token", data.token);
            showNotification("Login successful! 🐾", "success");

            setTimeout(() => {
                if (role === "admin") {
                    window.location.href = "admin.html";
                } else if (role === "public") {
                    window.location.href = "public.html";
                } else if (role === "volunteer") {
                    window.location.href = "volunteer.html";
                }
            }, 1000);

        } else {
            showNotification(data.message, "error");
        }

    } catch (err) {
        console.log(err);
        showNotification("Server error", "error");
    }
}

// 📝 REGISTER
async function register() {
    const role = document.getElementById("regRole").value;
    const username = document.getElementById("regUsername").value;
    const email = document.getElementById("regEmail").value;   // ✅
    const password = document.getElementById("regPassword").value;

    if (!role || !username || !email || !password) {
        alert("Please fill all fields");
        return;
    }

    const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ role, username, email, password })
    });

    const data = await res.json();
    alert(data.message);
}

// 🔄 Section Switch (Public Dashboard)
function showSection(id) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => sec.classList.remove('active'));
    
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const activeSection = document.getElementById(id);
    if (activeSection) activeSection.classList.add('active');
    
    const activeMenuItem = document.querySelector(`[data-section="${id}"]`);
    if (activeMenuItem) activeMenuItem.classList.add('active');
}

// Admin Section Switch
function showAdminSection(id) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => sec.classList.remove('active'));
    
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const activeSection = document.getElementById(id);
    if (activeSection) activeSection.classList.add('active');
    
    const activeMenuItem = document.querySelector(`[data-section="${id}"]`);
    if (activeMenuItem) activeMenuItem.classList.add('active');
    
    if (id === 'reports') {
        loadAllReports();
    }
}

// Handle Image Upload Preview
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            const placeholder = document.querySelector('.upload-placeholder');
            
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// 📸 Submit Report
async function submitReport() {
    const fileInput = document.getElementById("image");
    const description = document.getElementById("description")?.value;

    if (!fileInput || !fileInput.files[0] || !description) {
        showNotification("Please add image and description", "error");
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {
        const base64 = reader.result;

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const location = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            const token = localStorage.getItem("token");

            try {
                showNotification("Submitting report...", "info");
                
                const res = await fetch(`${BASE_URL}/report`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": token
                    },
                    body: JSON.stringify({
                        description,
                        image: base64,
                        location
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    showNotification("Report submitted successfully! 🐾", "success");
                    document.getElementById("description").value = '';
                    document.getElementById("image").value = '';
                    document.getElementById('imagePreview').style.display = 'none';
                    document.querySelector('.upload-placeholder').style.display = 'flex';
                } else {
                    showNotification(data.message, "error");
                }

            } catch (err) {
                console.log(err);
                showNotification("Error submitting report", "error");
            }

        }, () => {
            showNotification("Location permission denied", "error");
        });
    };

    reader.readAsDataURL(fileInput.files[0]);
}

// 📊 Get Reports
async function getReports() {
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${BASE_URL}/my-reports`, {
            headers: {
                "Authorization": token
            }
        });

        const data = await res.json();
        const list = document.getElementById("reportList");
        if (!list) return;

        list.innerHTML = "";

        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><p>No reports found</p></div>';
            return;
        }

        data.forEach(r => {
            const statusClass = r.status === 'Resolved' ? 'resolved' : r.status === 'In Progress' ? 'progress' : 'pending';
            
            const card = document.createElement("div");
            card.className = "report-card";
            card.innerHTML = `
                <div class="report-status ${statusClass}">${r.status}</div>
                <p class="report-desc">${r.description}</p>
                <div class="report-meta">
                    <span>📍 ${r.location}</span>
                </div>
            `;
            list.appendChild(card);
        });

    } catch (err) {
        console.log(err);
        showNotification("Error loading reports", "error");
    }
}

// 🐶 Get Adoptions
async function getAdoptions() {
    try {
        const res = await fetch(`${BASE_URL}/adoptions`);
        const data = await res.json();

        const list = document.getElementById("adoptionList");
        if (!list) return;

        list.innerHTML = "";

        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state"><span class="empty-icon">🐾</span><p>No animals available for adoption</p></div>';
            return;
        }

        data.forEach(a => {
            const card = document.createElement("div");
            card.className = "adoption-card";
            card.innerHTML = `
                <div class="adoption-icon">${a.animalType === 'Dog' ? '🐕' : a.animalType === 'Cat' ? '🐈' : '🐾'}</div>
                <h3>${a.animalType}</h3>
                <p>${a.description}</p>
                <button class="btn-adopt">Adopt Me</button>
            `;
            list.appendChild(card);
        });

    } catch (err) {
        console.log(err);
        showNotification("Error loading adoptions", "error");
    }
}

// ADMIN FUNCTIONS

// Load all reports
async function loadAllReports() {
    const token = localStorage.getItem("token");
    
    try {
        const res = await fetch(`${API}/all-reports`, {
            headers: { Authorization: token }
        });

        const data = await res.json();
        const list = document.getElementById("allReports");
        list.innerHTML = "";

        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><p>No reports found</p></div>';
            return;
        }

        data.forEach(r => {
            const card = document.createElement("div");
            card.className = "admin-report-card";
            card.innerHTML = `
                <div class="admin-report-image">
                    <img src="${r.image}" alt="Report Image">
                </div>
                <div class="admin-report-content">
                    <p class="report-desc">${r.description}</p>
                    <div class="report-meta">
                        <span>📍 ${r.location}</span>
                    </div>
                    <div class="status-selector">
                        <label>Status:</label>
                        <select class="status-dropdown" onchange="updateStatus('${r._id}', this.value)">
                            <option ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option ${r.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </div>
                </div>
            `;
            list.appendChild(card);
        });
    } catch (err) {
        console.log(err);
        showNotification("Error loading reports", "error");
    }
}

// Update Status
async function updateStatus(id, status) {
    const token = localStorage.getItem("token");
    
    try {
        await fetch(`${API}/update-status/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: token
            },
            body: JSON.stringify({ status })
        });

        showNotification("Status updated ✅", "success");
    } catch (err) {
        showNotification("Error updating status", "error");
    }
}

// Toggle Adoption Form
function toggleAdoptionForm() {
    const form = document.getElementById("adoptionForm");
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

// Add Adoption Animal
async function addAdoption() {
    const animalType = document.getElementById("animalType").value;
    const description = document.getElementById("animalDesc").value;
    const token = localStorage.getItem("token");

    if (!animalType || !description) {
        showNotification("Please fill all fields", "error");
        return;
    }

    try {
        await fetch(`${API}/add-adoption`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: token
            },
            body: JSON.stringify({ animalType, description })
        });

        showNotification("Animal added for adoption 🐾", "success");
        document.getElementById("animalType").value = '';
        document.getElementById("animalDesc").value = '';
        toggleAdoptionForm();
    } catch (err) {
        showNotification("Error adding animal", "error");
    }
}

// VOLUNTEER FUNCTIONS

// Load Pending Reports
async function loadPendingReports() {
    const token = localStorage.getItem("token");
    
    try {
        const res = await fetch(`${API}/available-reports`, {
            headers: { Authorization: token }
        });

        const data = await res.json();
        const list = document.getElementById("pendingReports");
        list.innerHTML = "";

        // Update stats
        document.getElementById('pendingCount').textContent = data.length;

        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state"><span class="empty-icon">✅</span><p>No pending reports</p></div>';
            return;
        }

        data.forEach(r => {
            const card = document.createElement("div");
            card.className = "volunteer-report-card";
            card.innerHTML = `
                <div class="volunteer-report-image">
                    <img src="${r.image}" alt="Report">
                </div>
                <div class="volunteer-report-content">
                    <p class="report-desc">${r.description}</p>
                    <div class="report-meta">
                        <span>📍 ${r.location}</span>
                    </div>
                    <div class="volunteer-actions">
                        <button class="btn-accept" onclick="acceptReport('${r._id}')">Accept</button>
                        <button class="btn-complete" onclick="completeReport('${r._id}')">Mark Completed</button>
                    </div>
                </div>
            `;
            list.appendChild(card);
        });
    } catch (err) {
        console.log(err);
        showNotification("Error loading reports", "error");
    }
}

// Accept Report
async function acceptReport(id) {
    const token = localStorage.getItem("token");
    
    try {
        await fetch(`${API}/accept-report/${id}`, {
            method: "POST",
            headers: {
                Authorization: token
            }
        });

        showNotification("Report accepted 🚑", "success");
        loadPendingReports();
    } catch (err) {
        showNotification("Error accepting report", "error");
    }
}

// Complete Report
async function completeReport(id) {
    const token = localStorage.getItem("token");
    
    try {
        await fetch(`${API}/complete-report/${id}`, {
            method: "PUT",
            headers: {
                Authorization: token
            }
        });

        showNotification("Report completed ✅", "success");
        
        // Update completed count
        const current = parseInt(document.getElementById('completedCount').textContent);
        document.getElementById('completedCount').textContent = current + 1;
        
        loadPendingReports();
    } catch (err) {
        showNotification("Error completing report", "error");
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}