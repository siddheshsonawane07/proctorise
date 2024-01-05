import React, { useState, useEffect } from "react";
import * as faceapi from "face-api.js";

const FaceRecognition = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState(null);

  useEffect(() => {
    // Load faceapi models
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      setIsModelLoaded(true);
    };

    loadModels();
  }, []);

  const handleImageLoad = async (imageUrl) => {
    const proxyUrl = "http://localhost:3001/proxy?url="; // Update with your proxy server URL
    const response = await fetch(`${proxyUrl}${encodeURIComponent(imageUrl)}`);

    if (response.ok) {
      // const queryImage = await response.blob();
      const queryImage = await faceapi.fetchImage(imageUrl);

      const singleResult = await faceapi
        .detectSingleFace(queryImage)
        .withFaceLandmarks()
        .withFaceDescriptor();

      // Match with reference descriptors
      if (singleResult && faceMatcher) {
        const bestMatch = faceMatcher.findBestMatch(singleResult.descriptor);
        console.log(bestMatch.toString());
        // Do something with the result, e.g., display it on the UI
      }
    } else {
      console.error("Failed to fetch image from proxy");
    }
  };

  // Assuming you have labeled reference descriptors
  useEffect(() => {
    const labeledDescriptors = [
      new faceapi.LabeledFaceDescriptors("obama", [
        /* descriptorObama1, descriptorObama2 */
      ]),
      new faceapi.LabeledFaceDescriptors("trump", [
        /* descriptorTrump */
      ]),
      // Add more labeled descriptors as needed
    ];

    const newFaceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
    setFaceMatcher(newFaceMatcher);
  }, []);

  return (
    <div>
      <h1>Face Recognition App</h1>
      <input
        type="text"
        placeholder="Enter Image URL"
        onChange={(e) => handleImageLoad(e.target.value)}
      />
      {/* Add any UI elements or feedback for the recognition result */}
    </div>
  );
};

export default FaceRecognition;
