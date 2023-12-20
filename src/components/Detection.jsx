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
      };

      //for looking sideways
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
        let objectDetected = false;

        predictions.forEach((prediction) => {
          if (["cell phone", "book", "laptop"].includes(prediction.class)) {
            objectDetected = true;
          }
        });

        if (objectDetected) {
          console.log("error", "Object Detected", "Action has been Recorded");
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
