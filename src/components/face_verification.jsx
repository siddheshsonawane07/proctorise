import React, { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

const FaceRecognitionComponent = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const startWebcam = () => {
      console.log("Starting webcam...");
      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: false,
        })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((error) => {
          console.error("Error starting webcam:", error);
        });
    };

    const getLabeledFaceDescriptions = async () => {
      console.log("Fetching labeled face descriptions...");
      const labels = ["siddhesh"];
      return Promise.all(
        labels.map(async (label) => {
          const descriptions = [];
          // const img = await faceapi.fetchImage(`./labels/${label}/1.jpg`);
          const img = await faceapi.fetchImage(
            "https://firebasestorage.googleapis.com/v0/b/compiler-15a57.appspot.com/o/1.jpg?alt=media&token=d331e175-8acf-4028-9d51-6f72ff6c1062"
          ); // Use a specific image (e.g., 1.jpg)

          console.log("Image fetched:", img);
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          descriptions.push(detections.descriptor);
          console.log("Labeled face descriptions fetched:", descriptions);
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
      );
    };

    const setupFaceRecognition = async () => {
      console.log("Setting up face recognition...");
      const labeledFaceDescriptors = await getLabeledFaceDescriptions();
      console.log("Labeled face descriptors:", labeledFaceDescriptors);

      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptors();

        // const resizedDetections = faceapi.resizeResults(
        //   detections
        //   // displaySize
        // );

        // Iterate over detected faces
        detections.forEach((detection, i) => {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          const box = detection.detection.box;

          // Check if the best match has a certain level of confidence (adjust threshold as needed)
          if (bestMatch.distance < 0.5) {
            console.log(
              `Detected face: ${bestMatch.label} (Confidence: ${bestMatch.distance})`
            );
          } else {
            console.log("Face not recognized.");
          }
        });

        // Clear the canvas
        // canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      }, 3000);
    };

    const loadModelsAndSetupFaceRecognition = async () => {
      console.log("Loading models...");
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      ]);
      console.log("Models loaded");

      // Adjust the threshold
      faceapi.SsdMobilenetv1Options.minConfidence = 0.5;

      startWebcam();
      await setupFaceRecognition();
    };

    loadModelsAndSetupFaceRecognition();

    return () => {
      // Cleanup code if needed
    };
  }, []);

  return <video ref={videoRef} autoPlay playsInline muted />;
};

export default FaceRecognitionComponent;
