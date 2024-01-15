import React, { useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase-config";
import UploadImage from "../components/uploadImage";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

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
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
      <UploadImage webcamRef={webcamRef} user={user} />;
    </div>
  );
};

export default AuthProvider;
