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

const landing_router = require('./routes/landing.js');
const login_router = require('./routes/login.js');
const signup_router = require('./routes/signup.js');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.get('/',(req,res) => {
    res.render('landing');
});

app.use("/landing", landing_router);
app.use("/login", login_router);
app.use("/signup", signup_router);

app.get('/err', (req,res) => {
    res.render('error_404');
});
app.use((req, res) => {
    res.status(404).render("error_404");
});

app.listen(PORT, () => console.log(`Server active on ${PORT}`));