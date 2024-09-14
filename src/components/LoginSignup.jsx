import React, { useRef, useState } from "react";
import { auth } from "../utils/firebase-config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../redux/userSlice";
import { useNavigate } from "react-router-dom";

const LoginSignup = () => {
  const [isLogin, setIsLogin] = useState(true);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const nameRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault();

    const email = emailRef.current.value;
    const password = passwordRef.current.value;

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const { uid, displayName, email, photoURL } = user;

        dispatch(loginSuccess({ uid, displayName, email, photoURL }));
        navigate("/home");
      })
      .catch((error) => {
        console.log("Error: ", error.message);
      });
    navigate("/home");
  };

  const handleLogin = (e) => {
    e.preventDefault();

    const email = emailRef.current.value;
    const password = passwordRef.current.value;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const { uid, displayName, email, photoURL } = user;

        dispatch(loginSuccess({ uid, displayName, email, photoURL }));
        navigate("/home");
      })
      .catch((error) => {
        console.log("Error: ", error.message);
      });
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
      <button onClick={handleGoogleSignIn}>Signin with Google</button>
    </div>
  );
};

export default LoginSignup;
