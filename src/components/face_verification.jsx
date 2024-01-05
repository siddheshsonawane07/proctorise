import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import { firebaseConfig } from "../utils/firebase-config";
import { toast } from "react-toastify";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

const FaceVerification = () => {
  const [referenceImageURL, setReferenceImageURL] = useState(null);
  const [isMatched, setIsMatched] = useState(false);
  const videoRef = useRef();

  //   useEffect(() => {
  //     // Load face-api.js models
  //     Promise.all([
  //       faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  //       faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  //       faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  //     ]).then(() => {
  //       console.log("Face-api.js models loaded");
  //       // Now you can start using face-api.js functions
  //     });
  //   }, []);

  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    ]);
    // loadReferenceImage();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(getAuth(), provider);
      const user = result.user;
      console.log("Google Sign-In Successful:", user);

      // Set the reference image URL when the user signs in
      const referenceImageURL = await uploadReferenceImage();
      setReferenceImageURL(referenceImageURL);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const uploadReferenceImage = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;

    return new Promise(async (resolve, reject) => {
      videoRef.current.onloadeddata = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const context = canvas.getContext("2d");
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const dataURL = canvas.toDataURL("image/png");

        try {
          const storageRef = ref(
            getStorage(),
            `reference-images/${Date.now()}.png`
          );
          await uploadString(storageRef, dataURL, "data_url");

          // Get the download URL of the uploaded image
          const downloadURL = await getDownloadURL(storageRef);

          resolve(downloadURL);
        } catch (error) {
          reject(error);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    });
  };

  const verifyFace = async () => {
    try {
        const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: 512, // Adjust inputSize for better detection
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      if (detections.length > 0) {
        const faceMatcher = new faceapi.FaceMatcher(detections);
        const bestMatch = faceMatcher.findBestMatch(referenceImageURL);

        // You can set a threshold for face matching confidence
        const threshold = 0.6;

        if (bestMatch._distance < threshold) {
          console.log("Face match successful!");
          setIsMatched(true);
        } else {
          console.log("Face match failed.");
          setIsMatched(false);
        }
      } else {
        console.log("No faces detected.");
      }
    } catch (error) {
      console.error("Error verifying face:", error);
    }
  };

  return (
    <div>
      <h1>Face Verification</h1>
      <button onClick={handleGoogleSignIn}>Sign In with Google</button>
      <button onClick={verifyFace}>Verify Face</button>
      {isMatched && <p>Images Matched!</p>}
      <video ref={videoRef} autoPlay />
    </div>
  );
};

export default FaceVerification;
