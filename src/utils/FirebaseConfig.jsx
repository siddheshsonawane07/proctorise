import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBHlMzEEbgHkJq2jWXO8_2P4-ehsDN48XY",
  authDomain: "proctorise-22190.firebaseapp.com",
  projectId: "proctorise-22190",
  storageBucket: "proctorise-22190.appspot.com",
  messagingSenderId: "57986258213",
  appId: "1:57986258213:web:a98d655dcd3ff92a7cb6cc",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { firebaseConfig, auth, app, db, storage };
