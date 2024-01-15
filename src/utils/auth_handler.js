import React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../utils/firebase-config";
import UploadImage from "./UploadImage";

const AuthProvider = ({ children }) => {
  const [user] = useAuthState(auth);

  return <>{children({ user })}</>;
};

export default AuthProvider;
