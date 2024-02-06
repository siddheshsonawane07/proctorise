import React, { useRef, useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { auth, app } from "../utils/firebase-config";
import { Button } from "@material-ui/core";

const Home2 = () => {
  const [user] = useAuthState(auth);
  const webcamRef = useRef(null);
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
    navigate("/test");
  };

  return (
    <div>
      Home
      <div>
        <Button onClick={handleSystemCheck}> System Check </Button>
        <ul>
          <li>instruction 1</li>
          <li>instruction 2</li>
          <li>instruction 3</li>
          <li>instruction 4</li>
          <li>instruction 5</li>
        </ul>
      </div>
      <Button onClick={handleDetectionCheck}>Check the basic detections</Button>
      <Button onClick={handleTestButton}> Test Page</Button>
      <div>
        <p>hasStorageRef{hasStorageRef} </p>
      </div>
      <div>
        <p>imageLink{imageLink} </p>
      </div>
    </div>
  );
};

export default Home2;
