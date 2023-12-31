import React, { useRef, useEffect, useCallback, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";
import { toast } from "react-toastify";

const ObjectDetectionCanvas = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [visibilityCount, setVisibilityCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const handleObjectDetection = useCallback(async (predictions) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "red";
      ctx.fillStyle = "red";
      ctx.stroke();
      ctx.fillText(prediction.class, x, y > 10 ? y - 5 : 10);
    });
  }, []);

  useEffect(() => {
    let intervalId;

    const runDetection = async () => {
      await tf.ready();

      const objectModel = await cocoSsd.load();

      const detect = async () => {
        if (!webcamRef.current || webcamRef.current.video.readyState !== 4) {
          return;
        }

        const video = webcamRef.current.video;

        // Object Detection
        const predictions = await objectModel.detect(video);
        handleObjectDetection(predictions);
      };

      intervalId = setInterval(detect, 3000);

      // Cleanup function
      return () => {
        clearInterval(intervalId);
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

  return (
    <div style={{ position: "relative" }}>
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
          zIndex: 9,
          position: "absolute",
          width: 480,
          height: 480,
        }}
        videoConstraints={{
          width: 1280,
          height: 720,
          facingMode: "user",
        }}
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

export default ObjectDetectionCanvas;
