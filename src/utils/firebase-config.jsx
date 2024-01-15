import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZBqfyOxJa7IJ7MnCFEp8vzc89yIDJVGs",
  authDomain: "proctorise-885c0.firebaseapp.com",
  projectId: "proctorise-885c0",
  storageBucket: "proctorise-885c0.appspot.com",
  messagingSenderId: "551871288983",
  appId: "1:551871288983:web:b193bc9256c8fa4da0bbd2",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { firebaseConfig, auth, app };
