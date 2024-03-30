import React, { useEffect } from "react";
import Button from "@material-ui/core/Button";
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

  useEffect(() => {
    if (localStorage.getItem("userId")) {
      navigate("/home");
    }
  }, []);

  return (
    <div className="body">
      <div className="header">
        Proctored exams: Secure your exams with online exam proctoring with
        Proctorise
        <button onClick={handleGoogleSignIn}>TRY FOR FREE</button>
      </div>

      <div className="features">
        <div class="card">
          <div class="image"></div>
          <div class="content">
            <a href="#">
              <span class="title">
                <h6>Real-time Face Verification</h6>
              </span>
            </a>

            <p class="desc">
              Ensure the identity of exam takers through live face verification.
            </p>

            <a class="action" href="#">
              Find out more
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div class="card">
          <div class="image"></div>
          <div class="content">
            <a href="#">
              <span class="title">
                <h6>Face Recognition</h6>
              </span>
            </a>

            <p class="desc">
              Recognize registered users' faces during exams to prevent
              impersonation.
            </p>

            <a class="action" href="#">
              Find out more
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div class="card">
          <div class="image"></div>
          <div class="content">
            <a href="#">
              <span class="title">
                <h6>Pose Detection</h6>
              </span>
            </a>

            <p class="desc">
              Detect the Face Position of the examinee to avoid any cheating
              attempts.
            </p>

            <a class="action" href="#">
              Find out more
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div class="card">
          <div class="image"></div>
          <div class="content">
            <a href="#">
              <span class="title">
                <h6>Cheating Detection</h6>
              </span>
            </a>

            <p class="desc">
              Detect cheating behaviors such as looking away from the screen or
              using unauthorized materials.
            </p>

            <a class="action" href="#">
              Find out more
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
