// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

// Your Firebase project config
const firebaseConfig = {

  apiKey: "AIzaSyCxbJVa0sh3SdCF0YlB7qBbBDNys4lFCBs",

  authDomain: "hackathon-brainsbots.firebaseapp.com",

  projectId: "hackathon-brainsbots",

  storageBucket: "hackathon-brainsbots.firebasestorage.app",

  messagingSenderId: "921021986633",

  appId: "1:921021986633:web:83556b5961d9e98f05cc98"

};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth and providers
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
