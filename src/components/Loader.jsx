import React from "react";
import "./css/Home.css";

const Loader = () => {
  return (
    <div className="loader-container">
      <div className="loader-spinner"></div>
      <p className="loader-text">Loading...</p>
    </div>
  );
};

export default Loader;
