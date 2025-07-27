const express = require("express");
const { Router, urlencoded } = require("express");
const router = Router();
const { pool } = require("../firebase.js");
const verify_firebase_token = require('../middlewares/verify_token.js');

router.get('/',verify_firebase_token, (req,res) => {
    res.render('checklist');
});

router.use((req, res) => {
    res.status(404).render('error_404');
});

module.exports = router;