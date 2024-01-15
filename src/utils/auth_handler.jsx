import React, { useRef } from "react";
import Webcam from "react-webcam";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase-config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import UploadImage from "../components/UploadImage";
import Detection from "../components/Detection";

const AuthProvider = () => {
  const [user] = useAuthState(auth);
  const webcamRef = useRef(null);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // const user = result.user;
      console.log(user.displayName);
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

      {user ? (
        //when the user is logged in
        <Detection user={user} webcamRef={webcamRef} />
      ) : (
        // when the user is not logged in
        <div>
          <button onClick={handleGoogleSignIn}>Sign in with Google</button>

          <UploadImage user={user} webcamRef={webcamRef} />
        </div>
      )}

      <div>
        <Webcam
          ref={webcamRef}
          style={{
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            textAlign: "center",
            zIndex: 9,
            width: 480,
            height: 480,
          }}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user",
          }}
          screenshotFormat="image/png"
        />
      </div>
    </div>
  );
};

export default AuthProvider;
