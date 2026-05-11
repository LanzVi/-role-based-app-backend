const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-very-secure-secret';

app.use(cors({origin: ['http://127.0.0.1:5500', 'http://localhost:5500']})); //frontend url

app.use(express.json());//middleware to parse JSON bodies

// server.js - Update your mock database
let users = [
    {
        id: 1, 
        username: 'admin', 
        password: '', // Will be hashed below
        firstName: 'System', 
        lastName: 'Admin', 
        role: 'admin'
    },
    {
        id: 2, 
        username: 'alice', 
        password: '', 
        firstName: 'Alice', 
        lastName: 'Smith', 
        role: 'user'
    }
];

//post /api/register
app.post('/api/register', async (req, res) => {
    const { username, password, firstName, lastName, role = 'user' } = req.body;

    // ... validation logic ...

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length + 1,
        username,
        password: hashedPassword,
        firstName: firstName || 'New', // Fallback if name is missing
        lastName: lastName || 'User',
        role
    };

    users.push(newUser);
    res.status(201).json({ message: 'User Registered' });
});

//POST /api/login
app.post('/api/login', async(req, res) => {
    const { username, password } = req.body;

    const user = users.find (u => u.username === username);
    if (!user || !await bcrypt.compare(password, user.password)){
        return res.status(401).json({error: 'Invalid credentials'})
    }

    //generate JWT token
    const token = jwt.sign(
        {id: user.id, username: user.username, role: user.role},
        SECRET_KEY,
        {expiresIn: '1h'}
    );
});
 
// Send back the full user object the frontend needs
res.json({
    token,
    user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.username, // Map username to email for the UI
        role: user.role
    }
});

//Protected route: Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
    res.json({user: req.user});
});

//Role-based protected route: Admin-only
app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
    res.json({message: 'Welcome to admin dashboard!', data: 'Secret admin info'});
});

//Public route: Guest content
app.get('/api/content/guest', (req, res) => {
    res.json({message: 'Public content for guests!'});
});

//to support the Manage Accounts page
app.get('/api/admin/accounts', authenticateToken, authorizeRole('admin'), (req, res) => {
    // Map internal users to the format your frontend expects
    const accountList = users.map(u => ({
        firstName: u.username, // Or add firstName to your user objects
        lastName: '',
        email: u.username,
        role: u.role,
        verified: true
    }));
    res.json(accountList);
});

//Middleware portion

//token authentication
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({error: 'Access Token required'});
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err)  return res.status(403).json({error: 'Invalid or expired token'});
        req.user = user;
        next();
    });
}

function authorizeRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({error: 'Access denied: Insufficient permissions'});
        }
        next();
    }
};

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Try logging in with:');
    console.log(' - Username: admin, Password: admin123');
    console.log(' - Username: alice, Password: user123');
});