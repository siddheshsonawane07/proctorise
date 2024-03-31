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
        <div className="title-1">
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
      <div className="horizontal-div-1">
        <img
          src="https://assetsprelogin.mettl.com/_next/image/?url=%2Fassets%2Fonline-remote-proctoring%2FRemote-Proctoring-Solution.svg&w=384&q=75"
          className="graphics"
        />
        <div className="vertical-div-1">
          <div className="title-1">What is a Proctored Exam?</div>
          <div className="content-1">
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
      <div className="title-2">
        Proctorise: Secure online exam proctoring with an AI-powered tool
      </div>
      <div className="subtitle-1">
        Our Suite of Online Proctoring Services Ensures Cheating-Free Online
        Exams
      </div>
      <div className="card-row">
        <div className="card">
          <img
            src="https://assetsprelogin.mettl.com/_next/image/?url=%2Fassets%2Fstrategic-partnerships%2FStudent-authentication.svg&w=64&q=75"
            className="card-icon"
          />
          <div className="card-title">Student Authentication</div>
          <div className="card-content">
            <b>Multi-factor authentication </b>technology to eliminate the risk
            of student impersonation.
          </div>
          <button className="card-button">EXPLORE</button>
        </div>
        <div className="card">
          <img
            src="https://assetsprelogin.mettl.com/_next/image/?url=%2Fassets%2Fstrategic-partnerships%2FRemote-proctoring.svg&w=64&q=75"
            className="card-icon"
          />
          <div className="card-title">Proctoring Technology</div>
          <div className="card-content">
            A comprehensive <b>AI-based Proctoring Technology </b>supporting
            auto proctoring.
          </div>
          <button className="card-button">EXPLORE</button>
        </div>
        <div className="card">
          <img
            src="https://assetsprelogin.mettl.com/_next/image/?url=%2Fassets%2Fstrategic-partnerships%2FMettl-Secure-Browser.svg&w=64&q=75"
            className="card-icon"
          />
          <div className="card-title">Proctorise Secure Exam Browser</div>
          <div className="card-content">
            <b>Secure Browser Lockdown Technology </b>that sanitizes students'
            computers by disabling additional tabs, browsers, external ports,
            etc.
          </div>
          <button className="card-button">Explore </button>
        </div>
      </div>
      <div className="title-2">
        Our AI based proctoring features ensure total cheating prevention.
      </div>
      <div className="horizontal-div-1">
        <img
          src="https://assetsprelogin.mettl.com/_next/image/?url=%2Fassets%2Fonline-remote-proctoring%2FAI-based-Flag.gif&w=640&q=75"
          className="graphics"
        />
        <div className="vertical-div-1">
          <div className="horizontal-div-2">
            <img src="https://assetsprelogin.mettl.com/_next/image/?url=%2Fassets%2Fonline-remote-proctoring%2FVideo-Proctoring.svg&w=48&q=75" />
            <div className="title-3">Attention Proctoring</div>
            <div className="content-1">
              It checks students' video feeds to raises flags in case of any
              suspicious activity visible in the video
            </div>
          </div>
          <div className="horizontal-div-2">
            <img src="https://assetsprelogin.mettl.com/_next/image/?url=%2Fassets%2Fonline-remote-proctoring%2FImage-Proctoring.svg&w=48&q=75" />
            <div classNamed="title-3">Image Proctoring</div>
            <div className="content-1">
              It assesses checks students' pictures taken at regular intervals
            </div>
          </div>
          <div className="horizontal-div-2">
            <img src="https://assetsprelogin.mettl.com/_next/image/?url=%2Fassets%2Fonline-remote-proctoring%2FImage-Proctoring.svg&w=48&q=75" />
            <div className="title-3">Object Proctoring</div>
            <div className="content-1">
              It checks students' video feeds to raises flags in case of any
              suspicious objects visible in the video
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
