// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmmz1rqEFZ4-H8ysLQe2JkdXvtZS9aTwU",
  authDomain: "career-lesotho.firebaseapp.com",
  projectId: "career-lesotho",
  storageBucket: "career-lesotho.firebasestorage.app",
  messagingSenderId: "930311954012",
  appId: "1:930311954012:web:019c8312d4ba9f25ebd099",
  measurementId: "G-DGZSXYKC9K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, analytics };
