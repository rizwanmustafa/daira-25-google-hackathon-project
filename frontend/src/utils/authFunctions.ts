// src/utils/authFunctions.ts
import { auth, googleProvider, facebookProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Google sign-in error", error);
  }
};

export const signInWithFacebook = async () => {
  try {
    await signInWithPopup(auth, facebookProvider);
  } catch (error) {
    console.error("Facebook sign-in error", error);
  }
};
