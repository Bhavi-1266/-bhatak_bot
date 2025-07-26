import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDTPYKoba26sixt-H_YUFDo55xnXyiDzUg",
    authDomain: "bhatakbot.firebaseapp.com",
    projectId: "bhatakbot",
    storageBucket: "bhatakbot.firebasestorage.app",
    messagingSenderId: "118829151547",
    appId: "1:118829151547:web:296934e10cfb1e0716b31e",
    measurementId: "G-CSLHT7Q5RE"
};

let app;
if (!getApps().length) {
    console.log("Nice");
    app = initializeApp(firebaseConfig);
} else {
    console.log("Old");
    app = getApps()[0];
}

const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        try {
            console.log(email, password);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const token = await userCredential.user.getIdToken();
            console.log("This is your: ", token);
            document.cookie = `token=${token}; path=/; max-age=86400`;
            window.location.href = "/home";
        } catch (err) {
            console.log("HAHAHAHAH");
            // window.location.href = "/landing";
            // window.location.reload();
        }
    });
});
