import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD6JzEHEbGTiH1UE0mJ-cj9cfz3gUYH6YY",
  authDomain: "proctorise-9e9b9.firebaseapp.com",
  projectId: "proctorise-9e9b9",
  storageBucket: "proctorise-9e9b9.appspot.com",
  messagingSenderId: "34275606143",
  appId: "1:34275606143:web:95545bfd0b8c5b0026c94a",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { firebaseConfig, auth, app };
