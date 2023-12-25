// import { useRef, useEffect } from "react";
// import * as faceapi from "face-api.js";
// import "./detection.css";
// import firebase from "firebase/app";
// import "firebase/storage";

// function Detection3() {
//   const videoRef = useRef();
//   const canvasRef = useRef();

//   useEffect(() => {
//     startVideo();
//     videoRef && loadModels();
//   }, []);

//   const startVideo = () => {
//     navigator.mediaDevices
//       .getUserMedia({ video: true })
//       .then((currentStream) => {
//         videoRef.current.srcObject = currentStream;
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   };

//   const loadModels = () => {
//     Promise.all([
//       faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
//       faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
//       faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
//       faceapi.nets.faceExpressionNet.loadFromUri("/models"),
//     ]).then(() => {
//       faceMyDetect();
//     });
//   };

//   const faceMyDetect = () => {
//     setInterval(async () => {
//       const detections = await faceapi
//         .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
//         .withFaceLandmarks()
//         .withFaceExpressions();

//       canvasRef.current.innerHTML = ""; // Clear previous drawings
//       canvasRef.current.appendChild(faceapi.createCanvasFromMedia(videoRef.current));

//       faceapi.matchDimensions(canvasRef.current, {
//         width: 940,
//         height: 650,
//       });

//       const resized = faceapi.resizeResults(detections, {
//         width: 940,
//         height: 650,
//       });

//       faceapi.draw.drawDetections(canvasRef.current, resized);
//       faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
//       faceapi.draw.drawFaceExpressions(canvasRef.current, resized);
//     }, 1000);
//   };

//   // Capture image from the live feed and upload it to Firebase
//   const captureAndUploadImage = async () => {
//     const canvas = faceapi.createCanvasFromMedia(videoRef.current);
//     const context = canvas.getContext("2d");
//     context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//     const dataURL = canvas.toDataURL("image/png");

//     // Upload the image to Firebase Storage
//     try {
//       const storageRef = firebase.storage().ref();
//       const imageRef = storageRef.child("captured-image.png");

//       // Convert data URL to Blob
//       const blob = await fetch(dataURL).then((res) => res.blob());

//       // Upload the Blob to Firebase Storage
//       const snapshot = await imageRef.put(blob);

//       console.log("Image uploaded successfully!", snapshot);
//     } catch (error) {
//       console.error("Error uploading image to Firebase:", error);
//     }
//   };

//   return (
//     <div className="myapp">
//       <h1>Face Detection</h1>
//       <div className="appvide">
//         <video crossOrigin="anonymous" ref={videoRef} autoPlay></video>
//       </div>
//       <canvas ref={canvasRef} width="940" height="650" className="appcanvas" />
//       <button onClick={captureAndUploadImage}>Capture and Upload Image</button>
//     </div>
//   );
// }

// export default Detection3;
