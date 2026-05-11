// --- 1. AUTHENTICATION HEADER HELPER ---
//Creates the Bearer token header for protected routes
function getAuthHeader() {
    const token = sessionStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// --- 2. SESSION INITIALIZATION ---
window.addEventListener('load', async () => {
    const token = sessionStorage.getItem('authToken');
    const email = localStorage.getItem('current_user_email');
    
    if (token && email) {
        // Here you would typically call an /api/validate-token or /api/profile
        // For now, we restore the state using the cached email
        const user = window.db.accounts.find(u => u.email === email);
        if (user) setAuthState(true, user);
    }
    
    handleRouting();
});

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('getStartedBtn');

    startBtn.addEventListener('click', () => {
        // Move the user to the register page
        window.location.hash = '#/register';
    });
});
//------------------------------------------------------
//Logout Logic  
document.getElementById('logoutLink').addEventListener('click', (e) => {
    e.preventDefault();
    setAuthState(false);
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('current_user_email');
    window.location.hash = '#/login';
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
});
//---------------------------------------------------------
//local storage logic (Simulating a Database)
const STORAGE_KEY = 'ipt_demo_v1';
window.db = { accounts: [], employees: [], departments: [], requests: [] };
let currentUser = null;

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// Load local data (Keep this for UI state/fallback)
function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) window.db = JSON.parse(data);
}
loadFromStorage();
//--------------------------------------------------------------
function handleRouting() {
    const hash = window.location.hash || '#/';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    if (hash === '#/' || hash === '') {
        document.getElementById('home-page').classList.add('active');
    } else if (hash === '#/login') {
        document.getElementById('login-page').classList.add('active');
    } else if (hash === '#/register') {
        document.getElementById('register-page').classList.add('active');
    } else if (hash === '#/profile') {
        renderProfile();
        document.getElementById('profile-page').classList.add('active');
    } else if (hash === '#/accounts') {
        if (currentUser && currentUser.role === 'admin') {
            renderAccounts(); // This now calls the API!
            document.getElementById('accounts-page').classList.add('active');
        } else {
            window.location.hash = '#/profile';
        }
    }

    else if (hash === '#/employees') {
        if (currentUser && currentUser.role === 'admin') {
            renderEmployees();
            document.getElementById('employees-page').classList.add('active');
        } else {
            window.location.hash = '#/profile';
        }
    }
    else if (hash === '#/requests') {
        renderRequests(); // You still need to write this function!
        document.getElementById('requests-page').classList.add('active');
    }
}
//-------------------------------------------------------------
//Register Form Listener
document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault(); // Prevents the page from refreshing

    const userData = {
        firstName: document.getElementById('regFirst').value,
        lastName: document.getElementById('regLast').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPass').value
    };

    // Pass the data to your existing registration logic
    handleRegistration(userData);
});

// Listen for the "cue" change (whenever the URL hash changes) 
window.addEventListener('hashchange', handleRouting);

// Run once when the page first loads 
window.addEventListener('load', handleRouting);

// --- 5. UPDATED UI STATE MANAGEMENT ---
// Instruction Step 3: Update UI based on user role and auth status
function setAuthState(isAuth, user = null) {
    currentUser = user;
    const body = document.body;

    if (isAuth && user) {
        body.classList.add('authenticated');
        body.classList.remove('not-authenticated');
        
        // Hide or show "Admin" specific buttons/sections via CSS classes
        if (user.role === 'admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
    } else {
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
        sessionStorage.removeItem('authToken');
    }
}
//Registration
async function handleRegistration(userData) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: userData.email, // your backend uses 'username'
                password: userData.password,
                role: 'user' 
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration successful! Please log in.");
            window.location.hash = '#/login';
        } else {
            alert("Registration failed: " + data.error);
        }
    } catch (err) {
        alert("Server connection failed.");
    }
}

//Email Verification (Simulated)
function simulateVerification() {
    //Finds email we stored during registration
    const unverifiedEmail = localStorage.getItem('unverified_email');

    if (!unverifiedEmail) {
        alert("No pending verification found.");
        window.location.hash = '#/register';
        return;
    }

    //Finds that specific account in our 'database'
    const account = window.db.accounts.find(u => u.email === unverifiedEmail);

    if (account) {
        //Sets the 'Verified' stamp to true
        account.verified = true;
        
        //Saves the updated database back to storage
        saveToStorage();
        
        //Cleans up the temporary email storage
        localStorage.removeItem('unverified_email');

        alert("Email verified successfully! You can now log in.");
        
        //Sends them to the Login page
        window.location.hash = '#/login';
    }
}

// --- 3. LOGIN LOGIC (REPLACES LOCALSTORAGE) ---
// Instruction Step 1: Replace the old localStorage login logic with a fetch call
async function handleLogin(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Instruction Step 1: Save token in sessionStorage for persistence
            sessionStorage.setItem('authToken', data.token);
            localStorage.setItem('current_user_email', data.user.email);
            
            setAuthState(true, data.user);
            alert(`Welcome back, ${data.user.firstName}!`);
            window.location.hash = '#/profile';
        } else {
            // Instruction Step 1: Handle failed login
            alert('Login failed: ' + data.error);
        }
    } catch (err) {
        alert('Network error: Could not connect to the backend.');
    }
}

//Profile Management
function renderProfile() {
    //Safety check: If no one is logged in, send them away
    if (!currentUser) {
        window.location.hash = '#/login';
        return;
    }

    //Select the HTML elements
    const nameDisplay = document.getElementById('profileName');
    const emailDisplay = document.getElementById('profileEmail');
    const roleDisplay = document.getElementById('profileRole');

    //Inject the data from our currentUser object
    nameDisplay.innerText = `${currentUser.firstName} ${currentUser.lastName}`;
    emailDisplay.innerText = currentUser.email;
    roleDisplay.innerText = currentUser.role;
}

async function renderAccounts() {
    const tbody = document.getElementById('accountsTableBody');
    const userCount = document.getElementById('userCount');
    
    try {
        const res = await fetch('/api/admin/accounts', {
            headers: getAuthHeader() 
        });

        if (res.ok) {
            const accounts = await res.json();
            tbody.innerHTML = '';
            userCount.innerText = accounts.length;

            accounts.forEach((user, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>${user.email}</td>
                    <td><span class="badge ${user.role === 'Admin' ? 'bg-danger' : 'bg-primary'}">${user.role}</span></td>
                    <td>${user.verified ? '<span class="text-success">✔ Verified</span>' : '<span class="text-warning">⌛ Pending</span>'}</td>
                    <td><button class="btn btn-sm btn-outline-danger" onclick="deleteAccount(${index})">Delete</button></td>
                `;
                tbody.appendChild(row);
            });
        } else {
            // Instruction Step 2: Handle "Access Denied"
            alert("Access Denied: Admin privileges required.");
            window.location.hash = '#/profile';
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

// Function to delete a user
function deleteAccount(index) {
    if (confirm("Are you sure you want to delete this account?")) {
        window.db.accounts.splice(index, 1); // Remove from array
        saveToStorage(); // Save to localStorage
        renderAccounts(); // Refresh the table
    }
}

//Employee Management
function renderEmployees() {
    const tbody = document.getElementById('employeeTableBody');
    tbody.innerHTML = '';

    window.db.employees.forEach((emp, index) => {
        const row = `
            <tr>
                <td>${emp.firstName} ${emp.lastName}</td>
                <td>${emp.department}</td>
                <td>${emp.email}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${index})">Delete</button>
                </td>
            </tr>`;
        tbody.innerHTML += row;
    });
}

// Logic to handle the Form Submission
document.getElementById('employeeForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const newEmp = {
        firstName: document.getElementById('empFirstName').value,
        lastName: document.getElementById('empLastName').value,
        email: document.getElementById('empEmail').value,
        department: document.getElementById('empDept').value
    };

    window.db.employees.push(newEmp);
    saveToStorage();
    renderEmployees();

    // Close the modal using Bootstrap's built-in command
    bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
    e.target.reset(); // Clear the form
});

//Dynamic Item Management
function addItemRow() {
    const container = document.getElementById('requestItemsContainer');
    const rowId = Date.now(); // Unique ID for this specific row

    const rowHtml = `
        <div class="row g-2 mb-2 align-items-center" id="row-${rowId}">
            <div class="col-8">
                <input type="text" class="form-control item-name" placeholder="Item name" required>
            </div>
            <div class="col-3">
                <input type="number" class="form-control item-qty" value="1" min="1" required>
            </div>
            <div class="col-1">
                <button type="button" class="btn btn-danger btn-sm" onclick="removeRow(${rowId})">×</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHtml);
}

function removeRow(id) {
    document.getElementById(`row-${id}`).remove();
}

//Saving the "Array of Objects"
document.getElementById('requestForm').addEventListener('submit', (e) => {
    e.preventDefault();

    //Collect all the dynamic rows
    const itemElements = document.querySelectorAll('#requestItemsContainer .row');
    const items = [];

    itemElements.forEach(row => {
        items.push({
            name: row.querySelector('.item-name').value,
            qty: row.querySelector('.item-qty').value
        });
    });

    if (items.length === 0) {
        alert("Please add at least one item!");
        return;
    }

    //Build the final Request object
    const newRequest = {
        id: Date.now(),
        userEmail: currentUser.email,
        type: document.getElementById('reqType').value,
        items: items,
        status: 'Pending',
        date: new Date().toLocaleDateString()
    };

    //Save to our simulated database
    window.db.requests.push(newRequest);
    saveToStorage();
    
    //Update UI
    alert("Request submitted successfully!");
    bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
    document.getElementById('requestItemsContainer').innerHTML = ''; // Reset rows
    e.target.reset();
});

function showToast(message) {
    // Logic to create a temporary div and remove it after 3 seconds
    console.log("Toast shown: " + message); 
}

function renderRequests() {
    const tbody = document.getElementById('requestsTableBody');
    tbody.innerHTML = '';

    // Filter requests so users only see their own
    const myRequests = window.db.requests.filter(r => r.userEmail === currentUser.email);

    myRequests.forEach(req => {
        const itemSummary = req.items.map(i => `${i.qty}x ${i.name}`).join(', ');
        const row = `
            <tr>
                <td>${req.date}</td>
                <td>${req.type}</td>
                <td>${itemSummary}</td>
                <td><span class="badge status-${req.status.toLowerCase()}">${req.status}</span></td>
            </tr>`;
        tbody.innerHTML += row;
    });
}

function deleteEmployee(index) {
    if (confirm("Delete this employee?")) {
        window.db.employees.splice(index, 1);
        saveToStorage();
        renderEmployees();
    }
} 