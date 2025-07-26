const { auth } = require('../firebase.js');

const verify_firebase_token = async (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split('Bearer ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    if (!token) {
        return res.status(401).send('Missing token');
    }
    try {
        const decoded = await auth.verifyIdToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).send('Invalid or expired token');
    }
};

module.exports = verify_firebase_token;
