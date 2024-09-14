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
import { loginSuccess } from "../redux/userSlice";
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
    <div>
      <h2>{isLogin ? "Login" : "Signup"}</h2>
      <form onSubmit={isLogin ? handleLogin : handleSignup}>
        Email Id
        <input type="email" ref={emailRef} placeholder="Email" required />
        Password
        <input
          type="password"
          ref={passwordRef}
          placeholder="Password"
          required
        />
        {!isLogin && (
          <>
            Name <input type="text" ref={nameRef} placeholder="Name" required />
          </>
        )}
        <button type="submit">{isLogin ? "Login" : "Sign Up"}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Switch to Signup" : "Switch to Login"}
      </button>
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
    </div>
  );
};

export default LoginSignup;
