import React, { useState, useRef } from "react";
import Webcam from "react-webcam";
import { getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { useAuthState } from "react-firebase-hooks/auth";
import { app, auth } from "../utils/firebase-config";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const UploadImage = () => {
  const storage = getStorage(app);
  const [image, setImage] = useState(null);
  const [progress, setProgress] = useState(false);
  const [user] = useAuthState(auth);
  const webcamRef = useRef(null);
  const navigate = useNavigate();
  const profilePhoto = localStorage.getItem("user_photo");

  const capturePhoto = () => {
    if (webcamRef.current && webcamRef.current.video) {
      const video = webcamRef.current.video;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageSrc = canvas.toDataURL("image/png");
      setImage(imageSrc);
    } else {
      console.error("Webcam not ready or not mounted.");
    }
  };

  const uploadImageFunction = async () => {
    if (image) {
      try {
        const storageRef = ref(storage, `/images/${user.email}`);

        const imageBlob = await fetch(image);
        const imageBytes = await imageBlob.blob();

        const uploadTask = await uploadBytesResumable(storageRef, imageBytes);
        setProgress(true);
        alert("image uploaded");
      } catch (error) {
        console.log(error);
      }
    }
  };
  
  const handleSystemCheck = () => {
    navigate("/systemcheck");
  };

  const handleDetectionCheck = () => {
    navigate("/detectioncheck");
  };

  const handleUploadPhoto = () => {
    navigate("/uploadimage");
  };

  const handleCreateTest = () => {
    navigate("/createtest");
  };

  const handleAttemptTest = () => {
    navigate("/attempttest");
  };

  const handleProfilePhoto = () => {
    navigate("/home");
  };

  const handleLogoutButton = async () => {
    localStorage.clear();
    navigate("/");
  };

  useEffect(() => {
    if (progress) {
      navigate("/home");
    }
  }, [progress]);

  return (
    <div>
      <div className="home-2-body">
        <nav className="home-2-navbar">
          <a className="home-2-navbar-brand">Proctorise</a>
          <div className="home-2-button-container">
            <button className="home-2-button-1" onClick={handleSystemCheck}>
              System Check
            </button>
            <button className="home-2-button-1" onClick={handleDetectionCheck}>
              Check Basic Detections
            </button>
            <button className="home-2-button-1" onClick={handleUploadPhoto}>
              Upload Photo
            </button>
            <button className="home-2-button-1" onClick={handleCreateTest}>
              Create Test
            </button>
            <button className="home-2-button-1" onClick={handleAttemptTest}>
              Attempt Test
            </button>
            <button className="home-2-button-1" onClick={handleLogoutButton}>
              Logout
            </button>
          </div>

          <div className="home-2-user-profile" onClick={handleProfilePhoto}>
            {profilePhoto && <img id="profPhoto" src={profilePhoto} />}
          </div>
        </nav>
      </div>
      <Webcam
        ref={webcamRef}
        style={{
          marginTop: 60,
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
      <h1>{progress}</h1>
      <button onClick={capturePhoto} className="home-2-button-1">
        Capture Photo
      </button>
      {image && (
        <>
          <button onClick={uploadImageFunction} className="home-2-button-1">
            {" "}
            Upload Photo{" "}
          </button>
        </>
      )}
    </div>
  );
};

export default UploadImage;
