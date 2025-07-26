const express = require('express');
const { Router, urlencoded } = require("express");
const router = Router();
const { pool } = require("../firebase.js");
const axios = require('axios');

router.get('/',(req,res) => {
    res.render('cab');
});

router.post("/redirect", (req, res) => {
    const { lat, lng, category } = req.body;

    if (!lat || !lng || !category) {
        console.log('Issue');
        return res.status(400).send("Missing data");
    }

    const olaUrl = `https://book.olacabs.com/?lat=${lat}&lng=${lng}&category=${category}`;
    res.redirect(olaUrl);
});

router.use((req, res) => {
    res.status(404).render('error_404');
});

module.exports = router;
