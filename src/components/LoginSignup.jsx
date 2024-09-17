import React, { useRef, useState } from "react";
import { auth } from "../utils/FirebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../redux/UserSlice";
import { useNavigate } from "react-router-dom";

const LoginSignup = () => {
  const [isLogin, setIsLogin] = useState(true);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const nameRef = useRef(null); // Only used for signup
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    const email = emailRef.current.value;
    const password = passwordRef.current.value;
    const displayName = nameRef.current.value;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Update profile with displayName
      await updateProfile(user, { displayName });

      const { uid, photoURL } = user;

      dispatch(loginSuccess({ uid, displayName, email, photoURL }));
      navigate("/home");
    } catch (error) {
      console.log("Error: ", error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const email = emailRef.current.value;
    const password = passwordRef.current.value;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const { uid, displayName, photoURL } = user;

      dispatch(loginSuccess({ uid, displayName, email, photoURL }));
      navigate("/home");
    } catch (error) {
      console.log("Error: ", error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const { uid, displayName, email, photoURL } = result.user;

      dispatch(loginSuccess({ uid, displayName, email, photoURL }));
      navigate("/home");
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <div className="login-signup-container">
      <h2 className="login-signup-title">{isLogin ? "Login" : "Signup"}</h2>
      <form
        className="login-signup-form"
        onSubmit={isLogin ? handleLogin : handleSignup}
      >
        <label className="login-signup-label">Email Id</label>
        <input
          className="login-signup-input"
          type="email"
          ref={emailRef}
          placeholder="Email"
          required
        />

        <label className="login-signup-label">Password</label>
        <input
          className="login-signup-input"
          type="password"
          ref={passwordRef}
          placeholder="Password"
          required
        />

        {!isLogin && (
          <>
            <label className="login-signup-label">Name</label>
            <input
              className="login-signup-input"
              type="text"
              ref={nameRef}
              placeholder="Name"
              required
            />
          </>
        )}

        <button className="login-signup-button" type="submit">
          {isLogin ? "Login" : "Sign Up"}
        </button>
      </form>

      <button
        className="login-signup-switch"
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? "Switch to Signup" : "Switch to Login"}
      </button>

      <button className="login-signup-google" onClick={handleGoogleSignIn}>
        <span className="login-signup-google-icon">G</span> Sign in with Google
      </button>
    </div>
  );
};

export default LoginSignup;
