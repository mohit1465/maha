// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB58VYjQEQE14d7P1XpA29ObwAn63ebIRQ",
    authDomain: "maharaja-489c9.firebaseapp.com",
    projectId: "maharaja-489c9",
    storageBucket: "maharaja-489c9.firebasestorage.app",
    messagingSenderId: "280319783948",
    appId: "1:280319783948:web:d872ff6f925f0669676a29",
    measurementId: "G-XKN880GYM8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, storage, googleProvider };
