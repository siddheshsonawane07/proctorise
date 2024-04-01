import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { auth, app } from "../utils/firebase-config";
import "./css/Home2.css";

const Home2 = () => {
  const [user] = useAuthState(auth);
  const [hasStorageRef, setHasStorageRef] = useState(false);
  const [imageLink, setImageLink] = useState(null);
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
        setImageLink(imageLink);
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
    <div className="home-2-body">
      <nav className="home-2-navbar">
        {/* <div className="logo-container"> */}
        {/* <img id="logo" src="../public/icons/logo-1.png" alt="logo" /> */}
        {/* <a className="navbar-brand">Proctorise</a> */}
        {/* </div> */}
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

        <div className="home-2-user-profile">
          {profilePhoto && <img id="profPhoto" src={profilePhoto} />}
        </div>
      </nav>

      <div className="home-2-horizontal-div-1">
        <div className="home-2-instruction-div">
          <h2>Instructions</h2>
          <ul className="home-2-instruction-lines">
            <li className="home-2-instructions">
              You must use a functioning webcam and microphone
            </li>
            <li className="home-2-instructions">
              No cell phones or other secondary devices in the room or test area
            </li>
            <li className="home-2-instructions">
              Your desk/table must be clear of any materials except your
              test-taking device
            </li>
            <li className="home-2-instructions">
              No one else can be in the room with you
            </li>
            <li className="home-2-instructions">No talking</li>
            <li className="home-2-instructions">
              The testing room must be well-lit and you must be clearly visible
            </li>
            <li className="ihome-2-instructions">No dual screens/monitors</li>
            <li className="home-2-instructions">Do not leave the camera</li>
          </ul>
        </div>

        <div className="home-2-image-div">
          {imageLink && (
            <img
              className="home-2-uploadedimg"
              src={imageLink}
              alt="No Photo Uploaded"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home2;
