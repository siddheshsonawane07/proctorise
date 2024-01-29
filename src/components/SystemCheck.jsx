import React, { useEffect, useState } from "react";
import DetectRTC from "detectrtc";
import { ReactInternetSpeedMeter } from "react-internet-meter";

const SystemCheck = () => {
  const [browserInfo, setBrowserInfo] = useState({});
  const [internetSpeed, setInternetSpeed] = useState(null);
  const [webcamEnabled, setWebcamEnabled] = useState(null);

  useEffect(() => {
    // Function to check browser info and webcam permissions
    const checkSystemInfo = () => {
      setBrowserInfo({
        name: DetectRTC.browser.name,
        version: DetectRTC.browser.version,
      });

      setWebcamEnabled(DetectRTC.isWebsiteHasWebcamPermissions);
    };

    // Call the function when the component mounts
    checkSystemInfo();
  }, []); // Empty dependency array ensures that this effect runs only once on mount

  return (
    <div>
      <h1>System Compatibility Check</h1>
      <ul>
        <li>
          <b>Browser:</b> {browserInfo.name} {browserInfo.version}
        </li>
        <li>
          <b>Webcam:</b>{" "}
          {webcamEnabled !== null
            ? webcamEnabled
              ? "Enabled"
              : "Disabled"
            : "Checking..."}
        </li>
        <ReactInternetSpeedMeter
          txtSubHeading="Internet connection is slow"
          outputType="" // "alert"/"modal"/"empty"
          customClassName={null}
          pingInterval={2000} // milliseconds
          txtMainHeading="Opps..."
          thresholdUnit="megabyte" // "byte" , "kilobyte", "megabyte"
          threshold={50}
          downloadSize="1561257" // bytes
          callbackFunctionOnNetworkDown={(data) =>
            console.log(`Internet speed : ${data}`)
          }
          callbackFunctionOnNetworkTest={(data) => setInternetSpeed(data)}
        />
        <li>
          <b>Internet Speed:</b> {internetSpeed}
        </li>
      </ul>
    </div>
  );
};

export default SystemCheck;
