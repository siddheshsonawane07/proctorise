import React from "react";
import { useNavigate } from "react-router-dom";
import UserProfile from "./UserProfile";
import "./css/Home.css";

const Header = () => {
  const navigate = useNavigate();

  const handleHome = () => {
    navigate("/home");
  };

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
            <button className="home-2-button-1" onClick={handleHome}>
              Home
            </button>
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
