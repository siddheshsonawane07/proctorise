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

function ExamMonitoring() {
  const videoRef = useRef();
  const [isTakingExam, setIsTakingExam] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    startVideo();
    videoRef && loadModels();
    // Check periodically if the user is taking an exam
    const intervalId = setInterval(checkExamStatus, 5000); // Check every 5 seconds
    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((currentStream) => {
        videoRef.current.srcObject = currentStream;
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const loadModels = () => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    ]).then(() => {
      faceMyDetect();
    });
  };

  const faceMyDetect = async () => {
    try {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (detections.length > 0) {
        // Capture and upload image only if faces are detected
        await captureAndUploadImage();
      }
    } catch (error) {
      console.error("Error detecting faces:", error);
    }
  };

  const captureAndUploadImage = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/png");

    try {
      const storageRef = ref(storage, `captured-images/${Date.now()}.png`);
      await uploadString(storageRef, dataURL, "data_url");

      showToast("Image uploaded successfully!");
      console.log("Image uploaded successfully!");

      // Set user's exam status to true after capturing an image
      updateUserExamStatus(true);
    } catch (error) {
      console.error("Error uploading image to Firebase:", error);
    }
  };

  const updateUserExamStatus = async (status) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUser(currentUser); // Set user state
        setIsTakingExam(status); // Set exam status state
        const userRef = doc(firestore, "users", currentUser.uid);
        await updateDoc(userRef, { isTakingExam: status });
        console.log(`User is ${status ? "taking" : "not taking"} an exam`);
      }
    } catch (error) {
      console.error("Error updating user's exam status:", error);
    }
  };
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
  };

  const checkExamStatus = async () => {
    try {
      const currentUser = auth.currentUser;
      console.log("Current User:", currentUser.uid); // Log current user

      if (currentUser) {
        const userRef = doc(firestore, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const isTakingExam = userDoc.data().isTakingExam || false;
          setIsTakingExam(isTakingExam);
          console.log(
            `User is ${isTakingExam ? "taking" : "not taking"} an exam`
          );
        } else {
          console.log("User document not found");
        }
      }
    } catch (error) {
      console.error("Error checking user's exam status:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Google Sign-In Successful:", user);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };
  return (
    <div className="myapp">
      <h1>Face Detection</h1>
      <div className="appvide">
        <video crossOrigin="anonymous" ref={videoRef} autoPlay></video>
      </div>
      <button onClick={handleGoogleSignIn}>Sign In with Google</button>

      <button onClick={faceMyDetect}>Capture and Upload Image</button>

      <div>
        <h2>User Information</h2>
        {user ? (
          <div>
            <p>User ID: {user.uid}</p>
            <p>
              Exam Status: {isTakingExam ? "Taking Exam" : "Not Taking Exam"}
            </p>
          </div>
        ) : (
          <p>No user information available.</p>
        )}
      </div>
    </div>
  );
}

export default ExamMonitoring;
