import React from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../utils/firebase-config";
import "./css/Home.css";

const Home = () => {
  const navigate = useNavigate();
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log(result.user.displayName);
      localStorage.setItem("userId", result.user);
      navigate("/home");
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <div className="body">
      <div className="header">
        <div id="title-1">
          Proctored exams: Secure your online assessments using Proctorise{" "}
        </div>
        <button
          className="greenButton"
          id="tryforfree"
          onClick={handleGoogleSignIn}
        >
          TRY FOR FREE
        </button>
      </div>
      <div className="horizontal-card">
        <img
          src="https://assetsprelogin.mettl.com/_next/image/?url=%2Fassets%2Fonline-remote-proctoring%2FRemote-Proctoring-Solution.svg&w=384&q=75"
          className="graphics"
        />
        <div className="horizontal-card-content">
          <div id="title-1">What is a Proctored Exam?</div>
          <div id="content-1">
            Proctor exam test is a term used to define an online assessment that
            employs a tech-enabled AI based proctoring software that
            automatically supervises a test taker. An online proctored test uses
            a combination of video and audio to prevent cheating. A proctor
            exam/test provides utmost strictness to an examination drive and
            eliminates any unwanted incident.
          </div>
          <button className="greenButton" id="tryforfree">
            REQUEST A DEMO
          </button>
        </div>
      </div>
      <div id="title-2">
        Proctorise: Secure online exam proctoring with an AI-powered tool
      </div>
      <div id="subtitle-1">
        Our Suite of Online Proctoring Services Ensures Cheating-Free Online
        Exams
      </div>
      <div className="card-row">
        <div className="card">
          <img
            src="https://img.icons8.com/ios/100/000000/id-verified.png"
            className="card-icon"
          />
          <h2>Student Authentication</h2>
          <p>This is the content of card 1.</p>
        </div>
        <div className="card">
          <img
            src="https://img.icons8.com/dotty/100/webcam.png"
            className="card-icon"
          />
          <h2>Proctoring technology</h2>
          <p>This is the content of card 2.</p>
        </div>
        <div className="card">
          <img
            src="https://img.icons8.com/ios/100/lock--v1.png"
            className="card-icon"
          />
          <h2>Proctorise Secure Exam Browser</h2>
          <p>This is the content of card 3.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
