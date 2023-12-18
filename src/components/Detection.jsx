import React, { useRef, useEffect, useState } from "react";

import "@tensorflow/tfjs";
// import * as posenet from "@tensorflow-models/posenet";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";

const Detection = () => {
  const webcamRef = useRef(null);
  const [score, setScore] = useState(100); // Initial score value

  useEffect(() => {
    const runDetection = async () => {
      // const net = await posenet.load({
      //   architecture: "ResNet50",
      //   quantBytes: 2,
      //   inputResolution: { width: 640, height: 480 },
      //   scale: 0.6,
      // });

      const objectModel = await cocoSsd.load();

      const detect = async () => {
        if (!webcamRef.current || webcamRef.current.video.readyState !== 4) {
          return;
        }

        const video = webcamRef.current.video;

        // Pose Detection
        // const pose = await net.estimateSinglePose(video);
        // earsDetect(pose.keypoints, 0.8);

        // Object Detection
        const predictions = await objectModel.detect(video);
        handleObjectDetection(predictions);
      };

      // const earsDetect = (keypoints, minConfidence) => {
      //   const [keypointEarR, keypointEarL] = keypoints.slice(3, 5);

      //   if (
      //     keypointEarL.score < minConfidence ||
      //     keypointEarR.score < minConfidence
      //   ) {
      //     showNotification("error", "You looked away from the screen");
      //     updateScore(-15); // Deduct more points when the user looks away
      //   }
      // };

      const handleObjectDetection = (predictions) => {
        let objectDetected = false;

        predictions.forEach((prediction) => {
          if (["cell phone", "book", "laptop"].includes(prediction.class)) {
            objectDetected = true;
          }
        });

        if (objectDetected) {
          console.log("error", "Object Detected", "Action has been Recorded");
          updateScore(-10); // Deduct points when an object is detected
        }
      };

      // const showNotification = (type, title, message) => {
      //   switch (type) {
      //     case "error":
      //       NotificationManager.error(message, title, 800, () => {});
      //       break;
      //     default:
      //       break;
      //   }
      // };

      const updateScore = (points) => {
        setScore((prevScore) => Math.max(0, prevScore + points));
      };

      // Deduct points over time to encourage continuous engagement
      updateScore(-2);

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
          textAlign: "center",
          zIndex: 9,
          width: 640,
          height: 480,
        }}
      />
      {/* <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          bottom: 1,
          color: "white", // Set the color to black
          fontSize: 24,
        }}
      >
        Score: {score}
      </div> */}
      {/* <NotificationContainer /> */}
    </div>
  );
};

export default Detection;
