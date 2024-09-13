import React, { useRef } from "react";
import { auth } from "../utils/firebase-config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../redux/userSlice";

const LoginSignup = () => {
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const nameRef = useRef(null);
  const dispatch = useDispatch();
  const email = useSelector((state) => state.user.email);

  const handleSignup = (e) => {
    e.preventDefault();

    const email = emailRef.current.value;
    const password = passwordRef.current.value;

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const { uid, displayName, email, photoUrl } = user;

        dispatch(loginSuccess({ uid, displayName, email, photoUrl }));
      })
      .catch((error) => {
        console.log("Error: ", error.message);
      });
  };

  return (
    <div>
      <form onSubmit={handleSignup}>
        Email Id
        <input type="email" ref={emailRef} placeholder="Email" />
        Password
        <input type="password" ref={passwordRef} placeholder="Password" />
        Name <input type="text" ref={nameRef} placeholder="Name" />
        <button type="submit">Sign Up</button>
      </form>
      {email}
    </div>
  );
};

export default LoginSignup;
