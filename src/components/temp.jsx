import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import "./detection.css";
import { auth } from "firebase";

function ExamMonitoring() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isTakingExam, setIsTakingExam] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    startVideo();
    videoRef && loadModels();
    // Check periodically if the user is taking an exam
    const intervalId = setInterval(checkExamStatus, 5000); // Check every 5 seconds
    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((currentStream) => {
        videoRef.current.srcObject = currentStream;
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const loadModels = () => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    ]).then(() => {
      faceMyDetect();
    });
  };

  const faceMyDetect = () => {
    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      canvasRef.current.innerHTML = ""; // Clear previous drawings
      canvasRef.current.appendChild(
        faceapi.createCanvasFromMedia(videoRef.current)
      );

      faceapi.matchDimensions(canvasRef.current, {
        width: 940,
        height: 650,
      });

      const resized = faceapi.resizeResults(detections, {
        width: 940,
        height: 650,
      });

      faceapi.draw.drawDetections(canvasRef.current, resized);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
      faceapi.draw.drawFaceExpressions(canvasRef.current, resized);
    }, 1000);
  };

  const captureAndUploadImage = async () => {
    const canvas = faceapi.createCanvasFromMedia(videoRef.current);
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/png");

    try {
      const storageRef = firebase.storage().ref();
      const imageRef = storageRef.child(`captured-images/${Date.now()}.png`);
      const blob = await fetch(dataURL).then((res) => res.blob());
      await imageRef.put(blob);

      console.log("Image uploaded successfully!");

      // Set user's exam status to true after capturing an image
      updateUserExamStatus(true);
    } catch (error) {
      console.error("Error uploading image to Firebase:", error);
    }
  };

  const updateUserExamStatus = async (status) => {
    try {
      const user = auth().currentUser;
      if (user) {
        setUser(user); // Set user state
        setIsTakingExam(status); // Set exam status state
        const userRef = firebase.firestore().collection("users").doc(user.uid);
        await userRef.update({ isTakingExam: status });
        console.log(`User is ${status ? "taking" : "not taking"} an exam`);
      }
    } catch (error) {
      console.error("Error updating user's exam status:", error);
    }
  };

  const checkExamStatus = async () => {
    try {
      const user = auth().currentUser;
      if (user) {
        const userRef = firebase.firestore().collection("users").doc(user.uid);
        const userDoc = await userRef.get();
        const isTakingExam = userDoc.data()?.isTakingExam || false;
        setIsTakingExam(isTakingExam);
        console.log(
          `User is ${isTakingExam ? "taking" : "not taking"} an exam`
        );
      }
    } catch (error) {
      console.error("Error checking user's exam status:", error);
    }
  };

  return (
    <div className="myapp">
      <h1>Face Detection</h1>
      <div className="appvide">
        <video crossOrigin="anonymous" ref={videoRef} autoPlay></video>
      </div>
      <canvas ref={canvasRef} width="940" height="650" className="appcanvas" />
      <button onClick={captureAndUploadImage}>Capture and Upload Image</button>

      <div>
        <h2>User Information</h2>
        {user ? (
          <div>
            <p>User ID: {user.uid}</p>
            <p>
              Exam Status: {isTakingExam ? "Taking Exam" : "Not Taking Exam"}
            </p>
          </div>
        ) : (
          <p>No user information available.</p>
        )}
      </div>
    </div>
  );
}

export default ExamMonitoring;
