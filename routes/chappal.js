const express = require("express");
const { Router, urlencoded } = require("express");
const router = Router();
const { pool } = require("../firebase.js");
const verify_firebase_token = require('../middlewares/verify_token.js');
const axios = require('axios');

router.get('/',verify_firebase_token, (req,res) => {
    res.render('chappal');
});

router.post('/directions', verify_firebase_token, async (req, res) => {
    const { message, location } = req.body;

    if (!message || !location) {
        return res.status(400).json({ error: 'Missing input' });
    }

    try {
        console.log('ORS API Key:', process.env.ORS_API_KEY);
        console.log("Received:", req.body);
        const witRes = await axios.get('https://api.wit.ai/message', {
            params: { q: message },
            headers: {
                Authorization: `Bearer ${process.env.WIT_AI_SERVER_TOKEN}`,
            },
        });

        // Step 2: Extract destination from wit (no origin parsing anymore)
        const intent = witRes.data.intents?.[0]?.name;
        const destEntity = witRes.data.entities['wit$location:destination']?.[0]?.value;
        const fallbackDest = witRes.data.entities['wit$location:location']?.[0]?.value;

        const origin = `${location.lat},${location.lon}`;  // always use current location
        const destination = destEntity || fallbackDest;

        console.log("Intent:", intent);
        console.log("Origin (from user location):", origin);
        console.log("Destination (from wit):", destination);

        if (intent !== 'get_directions' || !destination) {
            return res.json({ steps: null, message: 'No clear destination detected.' });
        }
        const locationIqKey = process.env.LOCATIONIQ_API_KEY;

        const getLocationIQCoords = async (query) => {
            const res = await axios.get('https://us1.locationiq.com/v1/search.php', {
                params: {
                    key: locationIqKey,
                    q: query,
                    format: 'json',
                    limit: 1
                }
            });
            const { lat, lon, display_name } = res.data[0];
            return {
                coords: [parseFloat(lon), parseFloat(lat)],
                name: display_name
            };
        };
        const [lat, lon] = origin.split(',').map(Number);
        const originCoord = [lon, lat];
        const destResult = await getLocationIQCoords(destination);
        const destCoord = destResult.coords;
        const destName = destResult.name;
        console.log("Destination name:", destName);


        console.log("Origin coordinates:", originCoord);
        console.log("Destination coordinates:", destCoord);

        if (!originCoord || !destCoord) {
            return res.json({ steps: null, message: 'Could not geocode origin or destination.' });
        }

        const orsRes = await axios.post(
            'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
            {
                coordinates: [originCoord, destCoord]
            },
            {
                headers: {
                    Authorization: process.env.ORS_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        const route = orsRes.data;
        const steps = orsRes.data.features[0].properties.segments[0].steps;


        return res.json({
            steps,
            destination,
            destName,
            route // send full ORS response so frontend can draw geometry
        });

    } catch (err) {
        console.error('Chappal mode error:', err.message);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

router.use((req, res) => {
    res.status(404).render('error_404');
});

module.exports = router;



