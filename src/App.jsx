import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoginSignup from "./components/LoginSignup";

const App = () => {
  return (
    <div>
      <LoginSignup />
      <ToastContainer />
    </div>
  );
};

export default App;
