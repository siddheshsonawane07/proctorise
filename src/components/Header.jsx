import React, { useState, useEffect } from "react";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { auth, app } from "../utils/firebase-config";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import UserProfile from "./UserProfile";

const Header = () => {
  const [hasStorageRef, setHasStorageRef] = useState(false);
  const [imageLink, setImageLink] = useState(null);
  const storage = getStorage(app);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userEmail = useSelector((state) => state.user.email);

  // useEffect(() => {
  //   const checkStorageRef = async () => {
  //     const image = user. photoURL;
  //     localStorage.setItem("user_photo", image);
  //     setProfilePhoto(image);
  //     const storageRef = ref(storage, `/images/${user.email}`);
  //     try {
  //       const imageLink = await getDownloadURL(storageRef);
  //       setHasStorageRef(true);
  //       setImageLink(imageLink);
  //     } catch (error) {
  //       setHasStorageRef(false);
  //     }
  //   };

  //   if (user) {
  //     checkStorageRef();
  //   }
  // }, [user, storage]);

  const handleCreateTest = () => {
    navigate("/createtest");
  };

  const handleSystemCheck = () => {
    navigate("/systemcheck");
  };

  const handleDetectionCheck = () => {
    navigate("/detectioncheck");
  };

  const handleUploadPhoto = () => {
    navigate("/uploadimage");
  };

  const handleAttemptTest = () => {
    navigate("/attempttest");
  };

  return (
    <>
      <div className="home-2-body">
        <nav className="home-2-navbar">
          <a className="home-2-navbar-brand" href="/">
            Proctorise
          </a>
          <div className="home-2-button-container">
            <Link to="/systemcheck">
              <button className="home-2-button-1" onClick={handleSystemCheck}>
                System Check
              </button>
            </Link>
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
          </div>
          {/* <div className="home-2-user-profile">
            {photoURL && <img id="profPhoto" src={photoURL} />}
          </div> */}
          <UserProfile />
        </nav>
      </div>
    </>
  );
};

export default Header;
