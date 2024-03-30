import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { auth, app } from "../utils/firebase-config";
import "./css/Home2.css";
import TestPage from "./TestPage";

const Home2 = () => {
  const [user] = useAuthState(auth);
  // const user = localStorage.getItem("userId");
  const [hasStorageRef, setHasStorageRef] = useState(false);
  const [imageLink, setimageLink] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const storage = getStorage(app);
  const navigate = useNavigate();

  useEffect(() => {
    const checkStorageRef = async () => {
      const image = user.photoURL;
      setProfilePhoto(image);
      const storageRef = ref(storage, `/images/${user.email}`);
      try {
        const imageLink = await getDownloadURL(storageRef);
        setHasStorageRef(true);
        setimageLink(imageLink);
      } catch (error) {
        setHasStorageRef(false);
      }
    };

    if (user) {
      checkStorageRef();
    }
  }, [user, storage]);

  const handleSystemCheck = () => {
    navigate("/systemcheck");
  };

  const handleDetectionCheck = () => {
    navigate("/detectioncheck");
  };

  // const handleTestButton = () => {
  //   if (hasStorageRef) {
  //     const formLink =
  //       "https://docs.google.com/forms/d/e/1FAIpQLSc949s3nmwj7ATngW04nszTiG2A9HdHm4YLylRP8kQCA-fyJA/viewform?usp=sf_link";
  //     const time = 15;
  //     navigate("/test", { state: { formLink: formLink, testTime: time } });
  //   } else {
  //     alert("Image not found. Please upload image first");
  //     navigate("/uploadimage");
  //   }
  // };

  const handleUploadPhoto = () => {
    navigate("/uploadimage");
  };

  const handleCreateTest = () => {
    navigate("/createtest");
  };

  const handleAttemptTest = () => {
    navigate("/attempttest");
  };

  const handleLogoutButton = async () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="mainCon">
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div>
          <img
            id="logo"
            src="https://cdn-icons-png.flaticon.com/128/8763/8763240.png"
            alt="logo"
          />
          <a className="navbar-brand">PROCTORISE</a>
        </div>
        <>
          <p className="forPhoto ">
            {profilePhoto && <img id="profPhoto" src={profilePhoto} />}
          </p>
        </>
      </nav>

      <div className="photoandinstr">
        <ul className="instruction-lines">
          <li className="instructions">
            You must use a functioning webcam and microphone
          </li>
          <li className="instructions">
            No cell phones or other secondary devices in the room or test area
          </li>
          <li className="instructions">
            Your desk/table must be clear or any materials except your
            test-taking device
          </li>
          <li className="instructions">
            No one else can be in the room with you
          </li>
          <li className="instructions">No talking</li>
          <li className="instructions">
            The testing room must be well-lit and you must be clearly visible
          </li>
          <li className="instructions">No dual screens/monitors</li>
          <li className="instructions">Do not leave the camera </li>
        </ul>
      </div>

      <div className="text-center">
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleSystemCheck}
        >
          {" "}
          System Check{" "}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleDetectionCheck}
        >
          Check the basic detections
        </button>
        {/* <button
          type="button"
          className="btn btn-danger"
          onClick={handleTestButton}
        >
          Test Page
        </button> */}
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleUploadPhoto}
        >
          Upload Photo{" "}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleLogoutButton}
        >
          Logout Page
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleCreateTest}
        >
          Create test
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleAttemptTest}
        >
          Attempt Test
        </button>
      </div>

      <div>
        <p className="uploadedimg-container">
          {imageLink && (
            <img
              className="uploadedimg"
              src={imageLink}
              alt="No Photo Uploaded"
              style={{ maxWidth: "1000px", maxHeight: "300px" }}
            />
          )}{" "}
        </p>
      </div>
    </div>
  );
};

export default Home2;
