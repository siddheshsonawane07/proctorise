import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDocs, query, where, collection, addDoc } from "firebase/firestore";
import { db } from "../utils/firebase-config";

const CreateTest = () => {
  const [values, setValues] = useState({
    formLink: "",
    testTime: "",
  });
  const profilePhoto = localStorage.getItem("user_photo");
  const navigate = useNavigate();

  const handleForm = async (e) => {
    e.preventDefault();

    if (!values.formLink || !values.testTime) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const formLinkQuery = query(
        collection(db, "testDetails"),
        where("formLink", "==", values.formLink)
      );
      const existingDocs = await getDocs(formLinkQuery);

      if (!existingDocs.empty) {
        alert("This form link already exists. Please use a different one.");
        return;
      }

      // adding test details to firestore
      const docRef = await addDoc(collection(db, "testDetails"), values);
      // console.log("Document written with ID: ", docRef.id);
      alert("test creation successfull");
      navigate("/home");
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
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

      <form className="test-form" onSubmit={(e) => handleForm(e)}>
        <label htmlFor="formLink">Form Link:</label>
        <input
          type="text"
          name="formLink"
          value={values.formLink}
          onChange={(e) => handleChange(e)}
        />

        <label htmlFor="testTime">Test Time (in minutes):</label>
        <input
          type="text"
          name="testTime"
          value={values.testTime}
          onChange={(e) => handleChange(e)}
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default CreateTest;