import React, { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { toast } from "react-toastify";
import { auth, storage } from "../utils/FirebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as faceapi from "@vladmandic/face-api";
import { useNavigate, useLocation } from "react-router-dom";

if (!tf.getBackend()) {
  tf.setBackend("webgl").then(() => console.log("WebGL backend initialized"));
}

const TestPage = React.memo(() => {
  const { state } = useLocation();
  const { formLink, testTime } = state || {};
  const webcamRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [timer, setTimer] = useState(testTime * 60);
  const [visibilityCount, setVisibilityCount] = useState(0);
  const [score, setScore] = useState(100);
  const navigate = useNavigate();

  const showToast = useCallback(
    (message, type) => {
      const toastOptions = {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        progress: undefined,
        type: type || "warning",
      };

      if (toasts.length >= 2) {
        const removedToastId = toasts.shift();
        toast.dismiss(removedToastId);
      }
      const newToast = toast(message, toastOptions);
      setToasts((prevToasts) => [...prevToasts, newToast]);
    },
    [toasts]
  );

  const updateScore = useCallback(
    (action, decrementScore) => {
      setScore((prevScore) => {
        const newScore = Math.max(prevScore - decrementScore, 0);
        if (newScore === 0) {
          navigate("/home");
        } else {
          console.log(`${action}, score decreased by ${decrementScore}`);
        }
        return newScore;
      });
    },
    [navigate, console.log]
  );

  useEffect(() => {
    let detectionsInterval;
    let countdown;
    let faceDetectionNet, faceLandmark68Net, faceRecognitionNet;

    const setupFaceRecognition = async (video) => {
      const user = auth.currentUser;
      const labels = [user.displayName];
      const storageRef = ref(storage, `/images/${user.email}`);
      const imageLink = await getDownloadURL(storageRef);

      const img = await faceapi.fetchImage(imageLink);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

      const labeledFaceDescriptors = new faceapi.LabeledFaceDescriptors(
        labels[0],
        [detection.descriptor]
      );
      const faceMatcher = new faceapi.FaceMatcher([labeledFaceDescriptors]);

      return async () => {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptors();

        detections.forEach((detection) => {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          if (bestMatch.distance >= 0.5) {
            updateScore("Face not verified", 5);
          }
        });
      };
    };

    const objectDetection = async (video) => {
      const objectModel = await cocoSsd.load();
      const predictions = await objectModel.detect(video);

      let faceCount = 0;

      predictions.forEach((prediction) => {
        if (prediction.class === "person") {
          faceCount++;
        } else if (
          ["cell phone", "book", "laptop"].includes(prediction.class)
        ) {
          updateScore("Object detected", 10);
        }
      });

      if (faceCount > 1) {
        updateScore("Multiple people detected", 15);
      } else if (faceCount === 0) {
        updateScore("No one detected", 5);
      }
    };

    const earsDetect = (keypoints, minConfidence) => {
      const keypointEarL = keypoints[3];
      const keypointEarR = keypoints[4];

      if (
        keypointEarL.score < minConfidence ||
        keypointEarR.score < minConfidence
      ) {
        updateScore("User looked away", 10);
      }
    };

    const loadModels = async () => {
      // Load face-api.js models
      faceDetectionNet = new faceapi.SsdMobilenetv1();
      faceLandmark68Net = new faceapi.FaceLandmark68Net();
      faceRecognitionNet = new faceapi.FaceRecognitionNet();

      await Promise.all([
        faceDetectionNet.loadFromUri("/models"),
        faceLandmark68Net.loadFromUri("/models"),
        faceRecognitionNet.loadFromUri("/models"),
      ]);

      const faceRecognition = await setupFaceRecognition(
        webcamRef.current.video
      );

      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      };
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      detectionsInterval = setInterval(async () => {
        await faceRecognition();

        const poses = await detector.estimatePoses(webcamRef.current.video);
        if (poses.length > 0) {
          earsDetect(poses[0].keypoints, 0.5);
        }

        await objectDetection(webcamRef.current.video);
      }, 3000);
    };

    loadModels();

    countdown = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer === 0) {
          clearInterval(countdown);
          navigate("/home");
          return 0;
        } else {
          return prevTimer - 1;
        }
      });
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setVisibilityCount((prevCount) => prevCount + 1);
        updateScore("Tab changed", 20);
      }
    };

    const handleCopyPaste = (event) => {
      updateScore(
        `${event.type.charAt(0).toUpperCase() + event.type.slice(1)}ing`,
        5
      );
      event.preventDefault();
    };

    const handleKeyDown = (event) => {
      const restrictedKeys = [27, 16, 18, 17, 91, 9, 44];
      if (restrictedKeys.includes(event.keyCode)) {
        updateScore("Restricted key pressed", 10);
        event.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(countdown);
      clearInterval(detectionsInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("keydown", handleKeyDown);
      navigate("/home");
    };
  }, [navigate, updateScore]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          width: "20%",
          height: "22%",
          top: "1rem",
          right: "3rem",
        }}
      >
        <p>Time remaining: {timer} </p>
        <p>Score: {score}</p>
        <Webcam
          ref={webcamRef}
          style={{
            zIndex: 9,
            width: "100%",
            height: "100%",
            border: "1px solid black",
            borderRadius: "1rem",
            objectFit: "cover",
          }}
          screenshotFormat="image/png"
        />
      </div>
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
        }}
      >
        <iframe
          style={{
            width: "100vw",
            aspectRatio: "16/9",
            overflowX: "hidden",
          }}
          src={formLink}
          frameBorder="0"
          marginHeight="0"
          marginWidth="0"
          title="Test Form"
        ></iframe>
      </div>
    </div>
  );
});

export default TestPage;
