import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import { useAuthState } from "react-firebase-hooks/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { auth, app } from "./firebase-config";
import UploadImage from "../components/UploadImage";
import Detection from "../components/Detection";

const AuthProvider = () => {
  const [user] = useAuthState(auth);
  const webcamRef = useRef(null);
  const [hasStorageRef, setHasStorageRef] = useState(false);
  const storage = getStorage(app);

  useEffect(() => {
    const checkStorageRef = async () => {
      const storageRef = ref(storage, `/images/${user.email}`);
      try {
        await getDownloadURL(storageRef);
        setHasStorageRef(true);
      } catch (error) {
        setHasStorageRef(false);
      }
    };

    if (user) {
      checkStorageRef();
    }
  }, [user, storage]);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log(result.user.displayName);
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
        hasStorageRef ? (
          <Detection
            user={user}
            webcamRef={webcamRef}
            storageRef={storageRef}
          />
        ) : (
          <UploadImage user={user} webcamRef={webcamRef} />
        )
      ) : (
        <button onClick={handleGoogleSignIn}>Sign in with Google</button>
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
