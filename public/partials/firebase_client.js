import { initializeApp } from "firebase/app";
import { getAnalytics, getAuth, signInWithEmailAndPassword } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDTPYKoba26sixt-H_YUFDo55xnXyiDzUg",
  authDomain: "bhatakbot.firebaseapp.com",
  projectId: "bhatakbot",
  storageBucket: "bhatakbot.firebasestorage.app",
  messagingSenderId: "118829151547",
  appId: "1:118829151547:web:296934e10cfb1e0716b31e",
  measurementId: "G-CSLHT7Q5RE"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

const loginUser = async function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    console.log("Hello");
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        if(!token) {
            console.log('I am not able to get in');
        }
        const res = await fetch('/protected', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.text();
        alert(data);
    } catch (err) {
        alert("Login failed: " + err.message);
    }
};
window.loginUser = loginUser;
