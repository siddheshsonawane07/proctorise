import React, { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs-core";

const Detection = () => {
  const webcamRef = useRef(null);

  useEffect(() => {
    const getLabeledFaceDescriptions = async () => {
      console.log("Fetching labeled face descriptions...");
      const labels = ["siddhesh"];
      return Promise.all(
        labels.map(async (label) => {
          const descriptions = [];
          const img = await faceapi.fetchImage(
            "https://firebasestorage.googleapis.com/v0/b/compiler-15a57.appspot.com/o/1.jpg?alt=media&token=d331e175-8acf-4028-9d51-6f72ff6c1062"
          );

          console.log("Image fetched");
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          descriptions.push(detections.descriptor);
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
      );
    };

    const setupFaceRecognition = async (video) => {
      console.log("Setting up face recognition...");
      const labeledFaceDescriptors = await getLabeledFaceDescriptions();
      console.log("Labeled face descriptors:", labeledFaceDescriptors);

      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

      // setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceDescriptors();

      detections.forEach((detection, i) => {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

        if (bestMatch.distance < 0.5) {
          console.log(
            `Detected face: ${bestMatch.label} (Confidence: ${bestMatch.distance})`
          );
        } else {
          console.log("Face not recognized.");
        }
      });
      // }, 1000);
    };

    // const detect = async () => {
    //   if (!webcamRef.current || webcamRef.current.video.readyState !== 4) {
    //     return;
    //   }

    //   let video = webcamRef.current.video;
    // };

    const objectDetection = async (predictions) => {
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

      // Adjust the threshold
      faceapi.SsdMobilenetv1Options.minConfidence = 0.5;

      setInterval(async () => {
        await setupFaceRecognition(webcamRef.current.video);

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

        // PoseNet detection
        const poses = await detector.estimatePoses(webcamRef.current.video);

        if (poses.length > 0) {
          earsDetect(poses[0].keypoints, 0.5);
        } else {
          console.log("No one detected");
        }
      }, 6000);
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
      />
    </div>
  );
};

export default Detection;
