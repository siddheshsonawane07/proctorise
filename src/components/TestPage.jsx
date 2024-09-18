import React, { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { toast } from "react-toastify";
import { storage } from "../utils/FirebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as faceapi from "@vladmandic/face-api";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const TestPage = () => {
  const { state } = useLocation();
  const { formLink, testTime } = state || {};
  const webcamRef = useRef(null);
  const userEmail = useSelector((state) => state.user.email);
  const userName = useSelector((state) => state.user.displayName);
  const [toasts, setToasts] = useState([]);
  const [timer, setTimer] = useState(testTime * 60);
  const [visibilityCount, setVisibilityCount] = useState(0);
  const [score, setScore] = useState(100); // Initial score
  const navigate = useNavigate();

  const showToast = (message, type) => {
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
  };

  const updateScore = (action, decrementScore) => {
    setScore((prevScore) => {
      const newScore = prevScore - decrementScore;
      if (newScore <= 0) {
        navigate("/home");
        return 0;
      }
      showToast(`${action}, score decreased by ${decrementScore}`);
      return newScore;
    });
  };

  useEffect(() => {
    const getLabeledFaceDescriptions = async () => {
      const labels = [`${userName}`];
      const storageRef = ref(storage, `/images/${userEmail}`);
      const imageLink = await getDownloadURL(storageRef);

      const descriptions = [];

      await Promise.all(
        labels.map(async () => {
          const img = await faceapi.fetchImage(imageLink);
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          descriptions.push(detections.descriptor);
        })
      );

      return new faceapi.LabeledFaceDescriptors(labels[0], descriptions);
    };

    const setupFaceRecognition = async (video) => {
      const labeledFaceDescriptors = await getLabeledFaceDescriptions();
      const faceMatcher = new faceapi.FaceMatcher([labeledFaceDescriptors]);

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(video)
          .withFaceLandmarks()
          .withFaceDescriptors();

        detections.forEach((detection) => {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

          if (bestMatch.distance < 0.5) {
            console.log(
              `Detected face: ${bestMatch.label} (Confidence: ${bestMatch.distance})`
            );
          } else {
            updateScore("Face not verified", 5);
          }
        });
      }, 5000);
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
      await tf.setBackend("webgl");
      await tf.ready();
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      ]);
      console.log("Models loaded");

      faceapi.SsdMobilenetv1Options.minConfidence = 0.5;

      await setupFaceRecognition(webcamRef.current.video);
    };
    loadModels();

    const detectionsInterval = setInterval(async () => {
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      };

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      const poses = await detector.estimatePoses(webcamRef.current.video);
      if (poses.length > 0) {
        earsDetect(poses[0].keypoints, 0.5);
      } else {
        console.log("No ears detected");
      }

      await objectDetection(webcamRef.current.video);
    }, 3000);

    const countdown = setInterval(() => {
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

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleCopyPaste = (event) => {
      updateScore(
        `${event.type.charAt(0).toUpperCase() + event.type.slice(1)}ing`,
        5
      );
      event.preventDefault();
    };

    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);

    const handleKeyDown = (event) => {
      const restrictedKeys = [27, 16, 18, 17, 91, 9, 44];
      if (restrictedKeys.includes(event.keyCode)) {
        updateScore("Restricted key pressed", 10);
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Cleanup functions
    return () => {
      clearInterval(countdown);
      clearInterval(detectionsInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("keydown", handleKeyDown);
      navigate("/home");
    };
  }, []);

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
          top: "1",
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
          "&::WebkitScrollbar": { width: 0, height: 0 },
          width: "100%",
          aspectRatio: "16/9",
        }}
      >
        <iframe
          style={{
            width: "100vw",
            aspectRatio: "16/9",
            "&::WebkitScrollbar": { width: 0, height: 0 },
            overflowX: "hidden",
          }}
          src={formLink}
          frameBorder="0"
          marginHeight="0"
          marginWidth="0"
        ></iframe>
      </div>
    </div>
  );
};

export default TestPage;
