import {useRef } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs-core";
import Webcam from "react-webcam";

const DetectionCheck = () => {
  const webcamRef = useRef(null);

  const objectDetection = (predictions) => {
    let faceCount = 0;

    predictions.forEach((prediction) => {
      if (prediction.class === "person") {
        faceCount++;
      } else if (["cell phone", "book", "laptop"].includes(prediction.class)) {
        console.log("Object Detected, Action has been Recorded");
      }
    });

    if (faceCount > 1) {
      console.log("Multiple People Detected");
    } else if (faceCount === 0) {
      console.log("No Face Detected");
    }
  };

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

  setInterval(async () => {
    await tf.ready();
    const objectModel = await cocoSsd.load();

    const detectorConfig = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
    };

    const detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      detectorConfig
    );

    const predictions = await objectModel.detect(webcamRef.current.video);
    objectDetection(predictions);

    const poses = await detector.estimatePoses(webcamRef.current.video);
    if (poses.length > 0) {
      earsDetect(poses[0].keypoints, 0.5);
    } else {
      console.log("No one detected");
    }
  }, 3000);

  return (
    <div>
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
        screenshotFormat="image/png"
      />
    </div>
  );
};

export default DetectionCheck;
