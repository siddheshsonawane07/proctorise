import React, { useEffect, useRef } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs-core";
import * as faceapi from "@vladmandic/face-api";
// import UploadImage from "./UploadImage";

const Detection = (user, webcamRef) => {
  // const webcamRef = useRef(null);

  useEffect(() => {
    const getLabeledFaceDescriptions = async () => {
      console.log("Fetching labeled face descriptions...");
      //put user.email
      const labels = [];
      const descriptions = [];

      // Use Promise.all to fetch images asynchronously
      await Promise.all(
        labels.map(async () => {
          //put image hyperlink
          const img = await faceapi.fetchImage();

          console.log("Image fetched");
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          descriptions.push(detections.descriptor);
        })
      );

      return new faceapi.LabeledFaceDescriptors(labels[0], descriptions);
    };

    const setupFaceRecognition = async (video) => {
      console.log("Setting up face recognition...");
      const labeledFaceDescriptors = await getLabeledFaceDescriptions();
      const faceMatcher = new faceapi.FaceMatcher([labeledFaceDescriptors]);

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(video)
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
        console.log(user);
      }, 6000);
    };

    const objectDetection = (predictions) => {
      let faceCount = 0;

      predictions.forEach((prediction) => {
        if (prediction.class === "person") {
          faceCount++;
        } else if (
          ["cell phone", "book", "laptop"].includes(prediction.class)
        ) {
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

    const loadModels = async () => {
      console.log("Loading models...");
      await tf.ready();
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      ]);
      console.log("Models loaded");

      faceapi.SsdMobilenetv1Options.minConfidence = 0.5;

      await setupFaceRecognition(webcamRef.current.video);

      setInterval(async () => {
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
    };

    loadModels();
  }, []);

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
      {/* <UploadImage webcamRef={webcamRef} /> */}
    </div>
  );
};

export default Detection;
