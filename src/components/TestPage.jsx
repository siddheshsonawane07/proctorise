import { useEffect } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs-core";
import * as faceapi from "@vladmandic/face-api";
import Notification from "./Notification";

const TestPage = () => {
  useEffect(() => {
    const getLabeledFaceDescriptions = async () => {
      const labels = [`${user.displayName}`];

      const descriptions = [];

      await Promise.all(
        labels.map(async () => {
          // console.log(imageLink);
          const img = await faceapi.fetchImage(imageLink);
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
            showNotification(
              `Detected face: ${bestMatch.label} (Confidence: ${bestMatch.distance})`
            );
          } else {
            showNotification("Face not recognized");
          }
        });
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
          showNotification("Object Detected, Action has been Recorded");
        }
      });

      if (faceCount > 1) {
        showNotification("Multiple People Detected");
      } else if (faceCount === 0) {
        showNotification("No Face Detected");
      }
    };

    const earsDetect = (keypoints, minConfidence) => {
      const keypointEarL = keypoints[3];
      const keypointEarR = keypoints[4];

      if (
        keypointEarL.score < minConfidence ||
        keypointEarR.score < minConfidence
      ) {
        showNotification("You looked away from the screen");
      }
    };

    const loadModels = async () => {
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
          showNotification("No one detected");
        }
      }, 3000);
    };

    const showNotification = (message) => {
      return <Notification message={message} />;
    };

    loadModels();
  }, []);
};

export default TestPage;
