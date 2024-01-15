import React, { useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase-config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { UploadImage } from "../components/UploadImage";

const AuthProvider = ({ children }) => {
  const [user] = useAuthState(auth);
  const webcamRef = useRef(null);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // const user = result.user;
      console.log(user);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <div>
      <header className="App-header">
        <p>Welcome to Proctorise</p>
        AI Enabled Virtual Examination System
      </header>
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
      <UploadImage webcamRef={webcamRef} user={user} />;
    </div>
  );
};

export default AuthProvider;
