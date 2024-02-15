import Webcam from "react-webcam";
import { useEffect, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { toast } from "react-toastify";
import { auth, app } from "../utils/firebase-config";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs-core";
import * as faceapi from "@vladmandic/face-api";

const TestPage = () => {
  const webcamRef = useRef(null);
  const [user] = useAuthState(auth);
  const storage = getStorage(app);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type) => {
    const toastOptions = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      progress: undefined,
      type: type || "warning",
    };

    if (toasts.length >= 2) {
      const removedToastId = toasts.shift(); // Remove the oldest toast
      toast.dismiss(removedToastId); // Dismiss the oldest toast
    }
    const newToast = toast(message, toastOptions);
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };

  useEffect(() => {
    const getLabeledFaceDescriptions = async () => {
      const labels = [`${user.displayName}`];
      const storageRef = ref(storage, `/images/${user.email}`);
      const imageLink = await getDownloadURL(storageRef);

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
            console.log(
              `Detected face: ${bestMatch.label} (Confidence: ${bestMatch.distance})`
            );
          } else {
            showToast("Face not verified");
          }
        });
      }, 3000);
    };

    const objectDetection = (predictions) => {
      let faceCount = 0;

      predictions.forEach((prediction) => {
        if (prediction.class === "person") {
          faceCount++;
        } else if (
          ["cell phone", "book", "laptop"].includes(prediction.class)
        ) {
          showToast("Object Detected, Action has been Recorded");
        }
      });

      if (faceCount > 1) {
        showToast("Multiple People Detected");
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
        showToast("You looked away from the screen");
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
          console.log("No ears detected");
        }
      }, 3000);
    };

    loadModels();
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          width: "20%",
          height: "22%",
          top: "1",
          right: "3rem",
        }}
      >
        <Webcam
          ref={webcamRef}
          style={{
            zIndex: 9,
            width: "100%",
            height: "100%",
            border: "1px solid black",
            borderRadius: "1rem",
            objectFit: "cover",
          }}
          screenshotFormat="image/png"
        />
      </div>
      <div
        style={{
          "&::WebkitScrollbar": { width: 0, height: 0 },

          width: "100%",
          aspectRatio: "16/9",
        }}
      >
        <iframe
          style={{
            width: "100vw",
            aspectRatio: "16/9",
            "&::WebkitScrollbar": { width: 0, height: 0 },
            overflowX: "hidden",
          }}
          src="https://docs.google.com/forms/d/e/1FAIpQLScpSTfCwslQ9ygom1heqwmFv-wgR_jQEoFOHuZwH4XVk-mAFg/viewform?usp=sf_link"
          frameBorder="0"
          marginHeight="0"
          marginWidth="0"
        ></iframe>
      </div>
    </div>
  );
};

export default TestPage;
