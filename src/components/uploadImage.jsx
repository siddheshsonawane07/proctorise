import React, { useState, useRef } from "react";
import Webcam from "react-webcam";
import { ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../utils/FirebaseConfig";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSelector } from "react-redux";

const UploadImage = () => {
  const [image, setImage] = useState(null);
  const [progress, setProgress] = useState(false);
  const webcamRef = useRef(null);
  const navigate = useNavigate();
  const userEmail = useSelector((state) => state.user.email);

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
        const storageRef = ref(storage, `/images/${userEmail}`);

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
      navigate("/home");
    }
  }, [progress]);

  return (
    <div>
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
            Upload Photo
          </button>
        </>
      )}
    </div>
  );
};

export default UploadImage;
