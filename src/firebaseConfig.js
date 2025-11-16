// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// OJO: pon aquí los datos de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDeLG7Q1xNW8s7B3HNggCFA_-SaRii-UNU",
  authDomain: "don-burgo-c5840.firebaseapp.com",
  projectId: "don-burgo-c5840",
  storageBucket: "don-burgo-c5840.appspot.com",
  messagingSenderId: "784998920811",
  appId: "1:784998920811:web:506d20d5f70fc3d170b72e",
  measurementId: "G-H8HHYCXP90"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
