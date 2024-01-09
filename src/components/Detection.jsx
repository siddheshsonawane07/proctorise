import React, { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

const Detection = () => {
  const webcamRef = useRef(null);
  const [isWebcamStarted, setWebcamStarted] = useState(false);

  const loadModels = async () => {
    try {
      // Load face detection models
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      console.log("SSD MobileNet loaded");

      // Load face recognition models
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      console.log("Face recognition loaded");

      // Load face landmark detection models
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      console.log("Face landmarks loaded");

      // Adjust the threshold
      faceapi.SsdMobilenetv1Options.minConfidence = 0.5;
    } catch (error) {
      console.error("Error loading face recognition models:", error);
    }
  };

  const startWebcam = async () => {
    try {
      console.log("Starting webcam...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      webcamRef.current.srcObject = stream;
      setWebcamStarted(true);
    } catch (error) {
      console.error("Error starting webcam:", error);
    }
  };

  const setupFaceRecognition = async () => {
    console.log("Setting up face recognition...");

    try {
      const labeledFaceDescriptors = await getLabeledFaceDescriptions();
      console.log("Labeled face descriptors:", labeledFaceDescriptors);

      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

      setInterval(async () => {
        if (isWebcamStarted) {
          const detections = await faceapi
            .detectAllFaces(webcamRef.current.video)
            .withFaceLandmarks()
            .withFaceDescriptors();

          detections.forEach((detection) => {
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

            if (bestMatch.distance < 0.5) {
              console.log(
                `Detected face: ${bestMatch.label} (Confidence: ${bestMatch.distance})`
              );
            } else {
              console.log("Face not recognized.");
            }
          });
        }
      }, 3000);
    } catch (error) {
      console.error("Error setting up face recognition:", error);
    }
  };

  const getLabeledFaceDescriptions = async () => {
    console.log("Fetching labeled face descriptions...");
    const labels = ["siddhesh"]; // put your own name
    return Promise.all(
      labels.map(async (label) => {
        try {
          const descriptions = [];
          const img = await faceapi.fetchImage(
            "https://firebasestorage.googleapis.com/v0/b/compiler-15a57.appspot.com/o/1.jpg?alt=media&token=d331e175-8acf-4028-9d51-6f72ff6c1062"
          );

          console.log("Image fetched");
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          descriptions.push(detections.descriptor);
          console.log("Labeled face descriptions fetched:", descriptions);
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        } catch (error) {
          console.error("Error fetching labeled face descriptions:", error);
        }
      })
    );
  };

  const handleObjectDetection = async (predictions) => {
    let faceCount = 0;

    predictions.forEach((prediction) => {
      if (prediction.class === "person") {
        faceCount++;
      } else if (["cell phone", "book", "laptop"].includes(prediction.class)) {
        console.log("Action has been Recorded");
      }
    });

    if (faceCount > 1) {
      console.log("Multiple People Detected");
    } else if (faceCount === 0) {
      console.log(
        "No Face Detected",
        "Please ensure your face is visible",
        "error"
      );
    }
  };

  const detect = async () => {
    await tf.ready();

    if (!webcamRef.current || webcamRef.current.video.readyState !== 4) {
      return;
    }

    const video = webcamRef.current.video;

    const objectModel = await cocoSsd.load();

    // Object Detection
    const predictions = await objectModel.detect(video);
    handleObjectDetection(predictions);
  };

  useEffect(() => {
    loadModels();
    startWebcam();
    setupFaceRecognition();
    detect();
  }, [isWebcamStarted]);

  return (
    <div>
      <div>
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
    </div>
  );
};

export default Detection;
