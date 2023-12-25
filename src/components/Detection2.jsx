import React, { useRef, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";

const Detection2 = () => {
  const webcamRef = useRef(null);

  const handleObjectDetection = useCallback(async (predictions) => {
    let faceCount = 0;
    predictions.forEach((prediction) => {
      if (prediction.class === "person") {
        faceCount++;
      } else if (
        prediction.class === "cell phone" ||
        prediction.class === "book" ||
        prediction.class === "laptop"
      ) {
        console.log("Object Detected", "Action has been Recorded", "error");
      }
    });

    if (faceCount > 1) {
      console.log("Multiple People Detected", "error");
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
      console.log("error", "You looked away from the screen");
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

        // Posenet detection
        const poses = await detector.estimatePoses(video);

        if (poses.length > 0) {
          earsDetect(poses[0].keypoints, 0.4);
        } else {
          console.log("No one detected");
        }
      };

      intervalId = setInterval(detect, 3000);

      // Cleanup function
      return () => clearInterval(intervalId);
    };

    runDetection();
  }, [handleObjectDetection]);

  return (
    <div>
      <Webcam
        ref={webcamRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          bottom: 0,
          top: 0,
          textAlign: "center",
          zIndex: 9,
          width: 640, // Adjust as needed
          height: 480, // Adjust as needed
        }}
        videoConstraints={{
          width: 1280, // Set a larger width for a more zoomed-out view
          height: 720, // Set a larger height for a more zoomed-out view
          facingMode: "user", // Use "user" for the front camera, "environment" for the rear camera
        }}
      />
    </div>
  );
};

export default Detection2;
