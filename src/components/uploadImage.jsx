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

  useEffect(() => {
    if (progress) {
      navigate("/test");
    }
  }, [progress]);

  return (
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
      <h1>{progress}</h1>
      <button onClick={capturePhoto}>Capture Photo</button>
      {image && (
        <>
          <button onClick={uploadImageFunction}> Upload Photo </button>
        </>
      )}
    </div>
  );
};

export default UploadImage;
