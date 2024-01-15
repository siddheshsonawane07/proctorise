import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdUzrEbUaFd92GDeezHjUdb0Va0y2k81A",
  authDomain: "test-3da7e.firebaseapp.com",
  projectId: "test-3da7e",
  storageBucket: "test-3da7e.appspot.com",
  messagingSenderId: "383320603264",
  appId: "1:383320603264:web:50ed19dbc6dc78bce30465",
  measurementId: "G-G01HGNEYQB",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { firebaseConfig, auth, app };
