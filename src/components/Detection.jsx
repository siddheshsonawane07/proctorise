import React, { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";

const Detection = () => {
  const webcamRef = useRef(null);
  // const [score, setScore] = useState(100); // Initial score value

  useEffect(() => {
    const runDetection = async () => {
      await tf.ready();

      // movenet using two ears
      // const detectorConfig = {
      //   modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      // };

      // const detector = await poseDetection.createDetector(
      //   poseDetection.SupportedModels.MoveNet,
      //   detectorConfig
      // );

      //posenet using two ears
      // const detectorConfig = {
      //   architecture: "MobileNetV1",
      //   outputStride: 16,
      //   inputResolution: { width: 640, height: 480 },
      //   multiplier: 0.75,
      // };
      // const detector = await poseDetection.createDetector(
      //   poseDetection.SupportedModels.PoseNet,
      //   detectorConfig
      // );

      //eye gazing using face-mask
      // const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      // const detectorConfig = {
      //   runtime: "mediapipe",
      //   solutionPath: "node_modules/@mediapipe/face_mesh",
      //   modelConfig: {
      //     modelType: "face_landmarks",
      //   },
      // };
      // const detector = await faceLandmarksDetection.createDetector(
      //   model,
      //   detectorConfig
      // );

      const objectModel = await cocoSsd.load();

      const detect = async () => {
        if (!webcamRef.current || webcamRef.current.video.readyState !== 4) {
          return;
        }

        const video = webcamRef.current.video;

        // const poses = await detector.estimatePoses(video);
        // console.log(poses.length);
        // const firstPose = poses[0];
        // earsDetect(poses[0].keypoints, 0.1);

        // const angle = 17;
        // preventLookDown(poses[0].keypoints, angle);

        // Object Detection
        const predictions = await objectModel.detect(video);
        handleObjectDetection(predictions);

        // const estimationConfig = { flipHorizontal: false };
        // const faces = await detector.estimateFaces(video, estimationConfig);
        // eyeTracking(faces[0].keypoints);
      };

      //for looking sideways
      // const earsDetect = (keypoints, minConfidence) => {
      //   const keypointEarL = keypoints[3];
      //   const keypointEarR = keypoints[4];

      //   if (
      //     keypointEarL.score < minConfidence ||
      //     keypointEarR.score < minConfidence
      //   ) {
      //     console.log("error", "You looked away from the screen");
      //   }
      // };

      //for eye tracking
      const eyeTracking = (keypoints) => {
        // Check if keypoints array is not empty
        if (keypoints && keypoints.length > 0) {
          // Get the left and right eye keypoints
          const leftEye = keypoints.find((point) => point.label === "left_eye");
          const rightEye = keypoints.find(
            (point) => point.label === "right_eye"
          );

          // Check if both eyes are detected
          if (leftEye && rightEye) {
            // Calculate the midpoint between the eyes
            const midPointX = (leftEye.x + rightEye.x) / 2;
            const midPointY = (leftEye.y + rightEye.y) / 2;

            // Define a region around the midpoint to represent the center of the face
            const regionWidth = 50;
            const regionHeight = 30;

            // Define the bounding box for the center region
            const regionLeft = midPointX - regionWidth / 2;
            const regionRight = midPointX + regionWidth / 2;
            const regionTop = midPointY - regionHeight / 2;
            const regionBottom = midPointY + regionHeight / 2;

            // Example: Log the coordinates of the bounding box
            console.log("Region:", {
              left: regionLeft,
              right: regionRight,
              top: regionTop,
              bottom: regionBottom,
            });

            // Example: Check if the user is looking away from the center region
            if (
              midPointX < regionLeft ||
              midPointX > regionRight ||
              midPointY < regionTop ||
              midPointY > regionBottom
            ) {
              console.log("Alert: User is looking away from the center");
              // Take appropriate action, e.g., pause the assessment
            }
          }
        }
      };

      //for looking down
      // const preventLookDown = (keypoints, maxDownwardAngle) => {
      //   if (keypoints.length >= 3) {
      //     const leftEye = keypoints[1];
      //     const rightEye = keypoints[2];
      //     const nose = keypoints[0];

      //     // Check confidence scores
      //     if (
      //       leftEye.score >= 0.1 &&
      //       rightEye.score >= 0.1 &&
      //       nose.score >= 0.1
      //     ) {
      //       // Calculate the average eye position
      //       const avgEyeX = (leftEye.x + rightEye.x) / 2;
      //       const avgEyeY = (leftEye.y + rightEye.y) / 2;

      //       // Calculate the angle formed by the eyes and the line connecting eyes to nose
      //       const angle =
      //         Math.atan2(nose.y - avgEyeY, nose.x - avgEyeX) * (180 / Math.PI);

      //       // Adjust the condition based on the desired angle range
      //       if (angle < -maxDownwardAngle) {
      //         console.log("Alert: User is looking down");
      //         // Take appropriate action, e.g., pause the assessment
      //       }
      //     }
      //   }
      // };

      //object detection using cocossd
      const handleObjectDetection = (predictions) => {
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
          console.log(
            "Multiple Faces Detected",
            "Please ensure only one face is visible",
            "error"
          );
        } else if (faceCount === 0) {
          console.log(
            "No Face Detected",
            "Please ensure your face is visible",
            "error"
          );
        }
      };

      setInterval(detect, 500);
    };

    runDetection();
  }, []); // Empty dependency array ensures the useEffect runs only once on component mount

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
          width: 640,
          height: 480,
        }}
      />
    </div>
  );
};

export default Detection;
