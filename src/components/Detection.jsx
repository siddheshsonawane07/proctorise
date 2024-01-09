import React, { useRef, useEffect, useCallback, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";

const Detection = () => {
  const webcamRef = useRef(null);

  const handleObjectDetection = useCallback(async (predictions) => {
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
  }, []);

  const earsDetect = (keypoints, minConfidence) => {
    const keypointEarL = keypoints[3];
    const keypointEarR = keypoints[4];

    if (
      keypointEarL.score < minConfidence ||
      keypointEarR.score < minConfidence
    ) {
      console.log("You looked away from the screen");
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
        if (!webcamRef.current || webcamRef.current.video.readyState !== 4) {
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
          console.log("No one detected");
        }
      };

      loadModelsAndSetupFaceRecognition();

      intervalId = setInterval(detect, 6000);

      // Cleanup functions
      return () => {
        clearInterval(intervalId);
      };
    };

    runDetection();
  }, [handleObjectDetection]);

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

        console.log("Image fetched");
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
        .detectAllFaces()
        .withFaceLandmarks()
        .withFaceDescriptors();

      // Iterate over detected faces
      detections.forEach((detection, i) => {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

        // Check if the best match has a certain level of confidence (adjust threshold as needed)
        if (bestMatch.distance < 0.5) {
          console.log(
            `Detected face: ${bestMatch.label} (Confidence: ${bestMatch.distance})`
          );
        } else {
          console.log("Face not recognized.");
        }
      });
    }, 3000);
  };

  const loadModelsAndSetupFaceRecognition = async () => {
    console.log("Loading models...");
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    ]);
    console.log("Models loaded");

    // Adjust the threshold
    faceapi.SsdMobilenetv1Options.minConfidence = 0.5;

    await setupFaceRecognition();
  };

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
