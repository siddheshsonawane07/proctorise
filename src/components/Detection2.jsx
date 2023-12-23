import React, { useRef, useEffect, useCallback, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";

const Detection2 = () => {
  const webcamRef = useRef(null);
  const [faceCount, setFaceCount] = useState(0);

  const handleObjectDetection = useCallback((predictions) => {
    let count = 0;
    predictions.forEach((prediction) => {
      if (prediction.class === "person") {
        count++;
      } else if (["cell phone", "book", "laptop"].includes(prediction.class)) {
        console.log("Object Detected", "Action has been Recorded", "error");
      }
    });

    setFaceCount(count);

    if (count > 1) {
      console.log(
        "Multiple Faces Detected",
        "Please ensure only one face is visible",
        "error"
      );
    } else if (count === 0) {
      console.log(
        "No Face Detected",
        "Please ensure your face is visible",
        "error"
      );
    }
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

      intervalId = setInterval(detect, 500);

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
          width: 640,
          height: 480,
        }}
      />
    </div>
  );
};

export default Detection2;
