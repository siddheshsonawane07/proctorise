import React, { useRef, useEffect, useCallback, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";
import { toast } from "react-toastify";
import * as faceapi from "face-api.js";

const CombinedDetection = () => {
  const webcamRef = useRef(null);
  const videoRef = useRef(null);
  const [visibilityCount, setVisibilityCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const handleObjectDetection = useCallback(async (predictions) => {
    let faceCount = 0;

    predictions.forEach((prediction) => {
      if (prediction.class === "person") {
        faceCount++;
      } else if (["cell phone", "book", "laptop"].includes(prediction.class)) {
        showToast("Action has been Recorded");
      }
    });

    if (faceCount > 1) {
      showToast("Multiple People Detected");
    } else if (faceCount === 0) {
      showToast(
        "No Face Detected",
        "Please ensure your face is visible",
        "error"
      );
    }
  }, []);

  const earsDetect = (keypoints, minConfidence) => {
    const keypointEarL = keypoints[3];
    const keypointEarR = keypoints[4];

    if (
      keypointEarL.score < minConfidence ||
      keypointEarR.score < minConfidence
    ) {
      showToast("You looked away from the screen");
    }
  };

  useEffect(() => {
    let intervalId;

    const runDetection = async () => {
      await tf.ready();

      const objectModel = await cocoSsd.load();

      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      };

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      const detect = async () => {
        if (
          !webcamRef.current ||
          webcamRef.current.video.readyState !== 4 ||
          !videoRef.current
        ) {
          return;
        }

        const video = webcamRef.current.video;

        // Object Detection
        const predictions = await objectModel.detect(video);
        handleObjectDetection(predictions);

        // PoseNet detection
        const poses = await detector.estimatePoses(video);

        if (poses.length > 0) {
          earsDetect(poses[0].keypoints, 0.5);
        } else {
          showToast("No one detected");
        }
      };

      intervalId = setInterval(detect, 5000);

      // Visibility change detection
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          setVisibilityCount((prevCount) => prevCount + 1);
          showToast("Warning: Tab Changed");
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Prevent copy and paste
      const handleCopyPaste = (event) => {
        showToast(
          `${
            event.type.charAt(0).toUpperCase() + event.type.slice(1)
          }ing is not allowed.`
        );
        event.preventDefault();
      };

      document.addEventListener("copy", handleCopyPaste);
      document.addEventListener("paste", handleCopyPaste);

      // Prevent certain special keys
      const handleKeyDown = (event) => {
        const restrictedKeys = [27, 16, 18, 17, 91, 9, 44]; // ESC, SHIFT, ALT, CONTROL, COMMAND, TAB, PRT SRC
        if (restrictedKeys.includes(event.keyCode)) {
          showToast("This key is restricted.");
          event.preventDefault();
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      // Cleanup functions
      return () => {
        clearInterval(intervalId);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        document.removeEventListener("copy", handleCopyPaste);
        document.removeEventListener("paste", handleCopyPaste);
        document.removeEventListener("keydown", handleKeyDown);
      };
    };

    runDetection();
  }, [handleObjectDetection]);

  const toggleFullScreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message}`
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

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

  const startWebcam = () => {
    console.log("Starting webcam...");
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: false,
      })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((error) => {
        console.error("Error starting webcam:", error);
      });
  };

  const getLabeledFaceDescriptions = async () => {
    console.log("Fetching labeled face descriptions...");
    const labels = ["siddhesh"]; //put your own name
    return Promise.all(
      labels.map(async (label) => {
        const descriptions = [];
        // const img = await faceapi.fetchImage(`./labels/${label}/1.jpg`);

        //put your own image
        const img = await faceapi.fetchImage(
          "https://firebasestorage.googleapis.com/v0/b/compiler-15a57.appspot.com/o/1.jpg?alt=media&token=d331e175-8acf-4028-9d51-6f72ff6c1062"
        ); // Use a specific image (e.g., 1.jpg)

        console.log("Image fetched:", img);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        descriptions.push(detections.descriptor);
        console.log("Labeled face descriptions fetched:", descriptions);
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  };

  const setupFaceRecognition = async () => {
    console.log("Setting up face recognition...");
    const labeledFaceDescriptors = await getLabeledFaceDescriptions();
    console.log("Labeled face descriptors:", labeledFaceDescriptors);

    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();

      // const resizedDetections = faceapi.resizeResults(
      //   detections
      //   // displaySize
      // );

      // Iterate over detected faces
      detections.forEach((detection, i) => {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        const box = detection.detection.box;

        // Check if the best match has a certain level of confidence (adjust threshold as needed)
        if (bestMatch.distance < 0.5) {
          console.log(
            `Detected face: ${bestMatch.label} (Confidence: ${bestMatch.distance})`
          );
        } else {
          console.log("Face not recognized.");
        }
      });

      // Clear the canvas
      // canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
  };

  const loadModelsAndSetupFaceRecognition = async () => {
    await tf.ready();
    console.log("Loading models...");
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    ]);
    console.log("Models loaded");

    // Adjust the threshold
    faceapi.SsdMobilenetv1Options.minConfidence = 0.5;

    startWebcam();
    await setupFaceRecognition();
  };

  useEffect(() => {
    loadModelsAndSetupFaceRecognition();
    return () => {};
  }, []);

  return (
    <div>
      <div>
        <button onClick={toggleFullScreen}>
          {document.fullscreenElement ? "Exit Fullscreen" : "Enter Fullscreen"}
        </button>{" "}
        <p>The text cannot be copied</p>
      </div>
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
      />
      <video ref={videoRef} autoPlay playsInline muted />
    </div>
  );
};

export default CombinedDetection;
