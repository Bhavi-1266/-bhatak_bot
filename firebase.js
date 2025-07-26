const admin = require('firebase-admin');
const serviceAccount = require('./firebase_pvt_key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const pool = admin.firestore();
const auth = admin.auth();

module.exports = { admin, pool, auth };
