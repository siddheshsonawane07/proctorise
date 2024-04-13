import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../utils/firebase-config";

const AttemptTest = () => {
  const [formLink, setFormLink] = useState("");
  const profilePhoto = localStorage.getItem("user_photo");
  const navigate = useNavigate();

  const handleForm = async (e) => {
    e.preventDefault();

    if (!formLink) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const formLinkQuery = query(
        collection(db, "testDetails"),
        where("formLink", "==", formLink)
      );

      const existingDocs = await getDocs(formLinkQuery);

      if (existingDocs.size > 0) {
        existingDocs.forEach((doc) => {
          const { testTime } = doc.data();
          console.log("Test Time:", testTime);
          setFormLink(formLink);
          // setTestTime(testTime);
          navigate("/test", { state: { formLink, testTime } });
        });
      } else {
        console.log("Form link not found in Firestore");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred. Please try again.");
    }
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

  const handleChange = (e) => {
    if (e.target.name === "formLink") {
      setFormLink(e.target.value);
    }
  };

  return (
    <div>
      <div className="home-2-body">
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
      </div>
      <form className="test-form" onSubmit={handleForm}>
        <label htmlFor="formLink">Form Link:</label>
        <input
          type="text"
          name="formLink"
          value={formLink}
          onChange={handleChange}
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default AttemptTest;
