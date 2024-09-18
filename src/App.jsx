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

    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  if (isMobileOrTablet) {
    return <DesktopOnlyOverlay />;
  }

  return <Outlet />;
};

export default App;
