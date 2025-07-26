import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-auth.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDTPYKoba26sixt-H_YUFDo55xnXyiDzUg",
    authDomain: "bhatakbot.firebaseapp.com",
    projectId: "bhatakbot",
    storageBucket: "bhatakbot.firebasestorage.app",
    messagingSenderId: "118829151547",
    appId: "1:118829151547:web:296934e10cfb1e0716b31e",
    measurementId: "G-CSLHT7Q5RE"
};

// Initialize Firebase safely
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const auth = getAuth(app);

window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signup-form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Signup success:", userCredential.user.email);
            window.location.href = "/login"; // redirect to login page after signup
        } catch (err) {
            console.error("Signup failed:", err.code, err.message);
            alert("Signup failed: " + err.message);
        }
    });
});
