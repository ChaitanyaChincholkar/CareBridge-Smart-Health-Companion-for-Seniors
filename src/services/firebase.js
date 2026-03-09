import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCa9dtJek8bS0kg187G4aXGI2B-lTVC_5s",
  authDomain: "carebridge-app-b413f.firebaseapp.com",
  projectId: "carebridge-app-b413f",
  storageBucket: "carebridge-app-b413f.firebasestorage.app",
  messagingSenderId: "86441953340",
  appId: "1:86441953340:web:bedbfd5d3c7e1cc44ddb39"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

