import React, { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";
import Webcam from "react-webcam";

const PoseCanvas = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [visibilityCount, setVisibilityCount] = useState(0);

  const drawPoseKeypoints = (ctx, keypoints) => {
    keypoints.forEach((keypoint) => {
      if (keypoint.score > 0.5) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      }
    });
  };

  useEffect(() => {
    const runDetection = async () => {
      await tf.ready();

      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      };

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      let intervalId;

      const detect = async () => {
        if (!webcamRef.current || webcamRef.current.video.readyState !== 4) {
          return;
        }

        const video = webcamRef.current.video;

        // MoveNet detection
        const poses = await detector.estimatePoses(video);

        if (poses.length > 0) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          poses.forEach((pose) => {
            drawPoseKeypoints(ctx, pose.keypoints);
          });
        } else {
          // Handle case when no pose is detected
          console.log("No one detected");
        }
      };

      intervalId = setInterval(detect, 1000);

      // Visibility change detection
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          setVisibilityCount((prevCount) => prevCount + 1);
          // Handle visibility change
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Cleanup functions
      return () => {
        clearInterval(intervalId);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    };

    runDetection();
  }, []);

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
        screenshotFormat="image/jpeg" // Add this line
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          bottom: 0,
          top: 0,
          zIndex: 10,
          width: 480, // Match the Webcam width
          height: 480, // Match the Webcam height
        }}
      />
    </div>
  );
};

export default PoseCanvas;
