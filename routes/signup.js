const express = require("express");
const { Router, urlencoded } = require("express");
const router = Router();
const { pool } = require("../firebase.js");

router.get('/',(req,res) => {
    res.render('signup');
});

router.use((req, res) => {
    res.status(404).render('error_404');
});

module.exports = router;