import React from "react";
import "./css/Home.css";

const DesktopOnlyOverlay = () => {
  return (
    <div className="desktop-only-overlay">
      <div className="desktop-only-content">
        <div className="desktop-only-icon">💻</div>
        <h1 className="desktop-only-title">Desktop Only</h1>
        <p className="desktop-only-message">
          This website is optimized for desktop viewing only. Please visit us on
          a desktop computer for the full experience.
        </p>
      </div>
    </div>
  );
};

export default DesktopOnlyOverlay;
