import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { auth, app } from "../utils/firebase-config";

const Home2 = () => {
  const [user] = useAuthState(auth);
  const [hasStorageRef, setHasStorageRef] = useState(false);
  const [imageLink, setimageLink] = useState(null);
  const storage = getStorage(app);
  const navigate = useNavigate();

  useEffect(() => {
    const checkStorageRef = async () => {
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

  const handleTestButton = () => {
    if (hasStorageRef) {
      navigate("/test");
    } else {
      alert("Image not found. Please upload image first");
      navigate("/uploadimage");
    }
  };

  const handleLogoutButton = async () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div>
      <div>
        <ul>
          <li>instruction 1</li>
          <li>instruction 2</li>
          <li>instruction 3</li>
          <li>instruction 4</li>
          <li>instruction 5</li>
        </ul>
      </div>
      <button onClick={handleSystemCheck}> System Check </button>
      <button onClick={handleDetectionCheck}>Check the basic detections</button>
      <button onClick={handleTestButton}> Test Page</button>
      <button onClick={handleLogoutButton}>Logout Page</button>
      <button>Create test</button>
      <button>Attempt Test</button>

      <div>
        <p>imageLink{imageLink} </p>
      </div>
    </div>
  );
};

export default Home2;
