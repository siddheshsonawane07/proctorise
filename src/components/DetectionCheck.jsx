import { useRef, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs-core";
import Webcam from "react-webcam";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const DetectionCheck = () => {
  const [toasts, setToasts] = useState([]);
  const webcamRef = useRef(null);
  const profilePhoto = localStorage.getItem("user_photo");
  const navigate = useNavigate();

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
      const removedToastId = toasts.shift();
      toast.dismiss(removedToastId);
    }
    const newToast = toast(message, toastOptions);
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };
  const objectDetection = (predictions) => {
    let faceCount = 0;

    predictions.forEach((prediction) => {
      if (prediction.class === "person") {
        faceCount++;
      } else if (["cell phone", "book", "laptop"].includes(prediction.class)) {
        showToast("Object Detected, Action has been Recorded");
      }
    });

    if (faceCount > 1) {
      showToast("Multiple People Detected");
    } else if (faceCount === 0) {
      showToast("No Face Detected");
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
      showToast("No one detected");
    }
  }, 8000);

  const handleSystemCheck = () => {
    navigate("/systemcheck");
  };

  const handleDetectionCheck = () => {
    navigate("/detectioncheck");
  };

  const handleUploadPhoto = () => {
    navigate("/uploadimage");
  };

  const handleCreateTest = () => {
    navigate("/createtest");
  };

  const handleAttemptTest = () => {
    navigate("/attempttest");
  };

  const handleProfilePhoto = () => {
    navigate("/home");
  };

  const handleLogoutButton = async () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div>
      <nav className="home-2-navbar">
        <a className="home-2-navbar-brand">Proctorise</a>
        <div className="home-2-button-container">
          <button className="home-2-button-1" onClick={handleSystemCheck}>
            System Check
          </button>
          <button className="home-2-button-1" onClick={handleDetectionCheck}>
            Check Basic Detections
          </button>
          <button className="home-2-button-1" onClick={handleUploadPhoto}>
            Upload Photo
          </button>
          <button className="home-2-button-1" onClick={handleCreateTest}>
            Create Test
          </button>
          <button className="home-2-button-1" onClick={handleAttemptTest}>
            Attempt Test
          </button>
          <button className="home-2-button-1" onClick={handleLogoutButton}>
            Logout
          </button>
        </div>
        <div className="home-2-user-profile" onClick={handleProfilePhoto}>
          {profilePhoto && <img id="profPhoto" src={profilePhoto} />}
        </div>
      </nav>
      <div className="detection-horizontal-div-1">
        <div className="home-2-vertical-div-1">
          <h2>Only following detection works for demo</h2>
          <ul className="home-2-instruction-lines">
            <li className="home-2-instructions">Attention Monitoring</li>
            <li className="home-2-instructions">Object Detection</li>
            <li className="home-2-instructions">Multiple People Detected</li>
          </ul>
        </div>
        <Webcam
          ref={webcamRef}
          style={{ zIndex: 9, width: 480, height: 480 }}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user",
          }}
          screenshotFormat="image/png"
        />
      </div>
    </div>
  );
};

export default DetectionCheck;
