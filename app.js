require('dotenv').config();
const express = require('express');
const path = require('path');
const PORT = 8000;
const app = express();
const admin = require('firebase-admin');
const serviceAccount = require('./firebase_pvt_key.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();
app.use(express.json());

const landing_router = require('./routes/landing.js');
const login_router = require('./routes/login.js');
const signup_router = require('./routes/signup.js');
const home_router = require('./routes/home.js');
const cab_router = require('./routes/call_a_cab.js');
const chappal_router = require('./routes/chappal.js');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.get('/',(req,res) => {
    res.render('landing');
});

app.use("/landing", landing_router);
app.use("/login", login_router);
app.use("/signup", signup_router);
app.use("/home", home_router);
app.use("/cab", cab_router);
app.use("/chappal", chappal_router);
app.get('/home', (req, res) => {
    res.render('home');
});

app.get('/api/config', (req, res) => {
    res.json({
        openrouterApiKey: process.env.OPENROUTER_API_KEY
    });
});

app.get('/api/test', async (req, res) => {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': req.get('host'),
                'X-Title': 'भटकBot'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json({ success: true, models: data.data?.length || 0 });
        } else {
            const errorText = await response.text();
            res.json({ success: false, error: errorText, status: response.status });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/err', (req,res) => {
    res.render('error_404');
});
app.use((req, res) => {
    res.status(404).render("error_404");
});

app.listen(PORT, () => console.log(`Server active on ${PORT}`));