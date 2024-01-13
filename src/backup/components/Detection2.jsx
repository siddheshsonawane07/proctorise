// import React, { useRef, useEffect, useCallback, useState } from "react";
// import * as tf from "@tensorflow/tfjs-core";
// import "@tensorflow/tfjs";
// import "@tensorflow/tfjs-backend-webgl";
// import * as poseDetection from "@tensorflow-models/pose-detection";
// import * as cocoSsd from "@tensorflow-models/coco-ssd";
// import Webcam from "react-webcam";
// import { toast } from "react-toastify";

// const Detection2 = () => {
//   const webcamRef = useRef(null);
//   const [visibilityCount, setVisibilityCount] = useState(0);
//   const [toasts, setToasts] = useState([]);

//   const handleObjectDetection = useCallback(async (predictions) => {
//     let faceCount = 0;

//     predictions.forEach((prediction) => {
//       if (prediction.class === "person") {
//         faceCount++;
//       } else if (["cell phone", "book", "laptop"].includes(prediction.class)) {
//         showToast("Action has been Recorded");
//       }
//     });

//     if (faceCount > 1) {
//       showToast("Multiple People Detected");
//     } else if (faceCount === 0) {
//       showToast(
//         "No Face Detected",
//         "Please ensure your face is visible",
//         "error"
//       );
//     }
//   }, []);

//   const earsDetect = (keypoints, minConfidence) => {
//     const keypointEarL = keypoints[3];
//     const keypointEarR = keypoints[4];

//     if (
//       keypointEarL.score < minConfidence ||
//       keypointEarR.score < minConfidence
//     ) {
//       showToast("You looked away from the screen");
//     }
//   };

//   useEffect(() => {
//     let intervalId;

//     const runDetection = async () => {
//       await tf.ready();

//       const objectModel = await cocoSsd.load();

//       const detectorConfig = {
//         modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
//       };

//       const detector = await poseDetection.createDetector(
//         poseDetection.SupportedModels.MoveNet,
//         detectorConfig
//       );

//       const detect = async () => {
//         if (!webcamRef.current || webcamRef.current.video.readyState !== 4) {
//           return;
//         }

//         const video = webcamRef.current.video;

//         // Object Detection
//         const predictions = await objectModel.detect(video);
//         handleObjectDetection(predictions);

//         // PoseNet detection
//         const poses = await detector.estimatePoses(video);

//         if (poses.length > 0) {
//           earsDetect(poses[0].keypoints, 0.5);
//         } else {
//           showToast("No one detected");
//         }
//       };

//       intervalId = setInterval(detect, 6000);

//       // Visibility change detection
//       const handleVisibilityChange = () => {
//         if (document.visibilityState === "visible") {
//           setVisibilityCount((prevCount) => prevCount + 1);
//           showToast("Warning: Tab Changed");
//         }
//       };

//       document.addEventListener("visibilitychange", handleVisibilityChange);

//       // Prevent copy and paste
//       const handleCopyPaste = (event) => {
//         showToast(
//           `${
//             event.type.charAt(0).toUpperCase() + event.type.slice(1)
//           }ing is not allowed.`
//         );
//         event.preventDefault();
//       };

//       document.addEventListener("copy", handleCopyPaste);
//       document.addEventListener("paste", handleCopyPaste);

//       // Prevent certain special keys
//       const handleKeyDown = (event) => {
//         const restrictedKeys = [27, 16, 18, 17, 91, 9, 44]; // ESC, SHIFT, ALT, CONTROL, COMMAND, TAB, PRT SRC
//         if (restrictedKeys.includes(event.keyCode)) {
//           showToast("This key is restricted.");
//           event.preventDefault();
//         }
//       };

//       document.addEventListener("keydown", handleKeyDown);

//       // Cleanup functions
//       return () => {
//         clearInterval(intervalId);
//         document.removeEventListener(
//           "visibilitychange",
//           handleVisibilityChange
//         );
//         document.removeEventListener("copy", handleCopyPaste);
//         document.removeEventListener("paste", handleCopyPaste);
//         document.removeEventListener("keydown", handleKeyDown);
//       };
//     };

//     runDetection();
//   }, [handleObjectDetection]);

//   const toggleFullScreen = () => {
//     const elem = document.documentElement;
//     if (!document.fullscreenElement) {
//       elem.requestFullscreen().catch((err) => {
//         console.error(
//           `Error attempting to enable full-screen mode: ${err.message}`
//         );
//       });
//     } else {
//       document.exitFullscreen();
//     }
//   };

//   const showToast = (message, type) => {
//     const toastOptions = {
//       position: "top-right",
//       autoClose: 5000,
//       hideProgressBar: false,
//       closeOnClick: true,
//       pauseOnHover: false,
//       draggable: false,
//       progress: undefined,
//       type: type || "warning",
//     };

//     if (toasts.length >= 2) {
//       const removedToastId = toasts.shift();
//       toast.dismiss(removedToastId);
//     }
//     const newToast = toast(message, toastOptions);
//     setToasts((prevToasts) => [...prevToasts, newToast]);
//   };

//   return (
//     <div>
//       <div>
//         <button onClick={toggleFullScreen}>
//           {document.fullscreenElement ? "Exit Fullscreen" : "Enter Fullscreen"}
//         </button>{" "}
//         <p>The text cannot be copied</p>
//       </div>
//       <Webcam
//         ref={webcamRef}
//         style={{
//           marginLeft: "auto",
//           marginRight: "auto",
//           left: 0,
//           right: 0,
//           bottom: 0,
//           top: 0,
//           textAlign: "center",
//           zIndex: 9,
//           width: 480,
//           height: 480,
//         }}
//         videoConstraints={{
//           width: 1280,
//           height: 720,
//           facingMode: "user",
//         }}
//       />
//     </div>
//   );
// };

// export default Detection2;
