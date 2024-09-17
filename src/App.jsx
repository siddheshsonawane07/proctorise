import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import DesktopOnlyOverlay from "./components/DesktopOnlyOverlay";

const App = () => {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileOrTablet(window.innerWidth <= 1024);
    };

    // Check on initial render
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize);

    // Clean up event listener on component unmount
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  if (isMobileOrTablet) {
    return <DesktopOnlyOverlay />;
  }

  return <Outlet />;
};

export default App;
