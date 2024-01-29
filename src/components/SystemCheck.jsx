import React, { useEffect, useState } from "react";
import DetectRTC from "detectrtc";
import { ReactInternetSpeedMeter } from "react-internet-meter";

const SystemCheck = () => {
  const [browserInfo, setBrowserInfo] = useState({});
  const [speedMbps, setSpeedMbps] = useState([0]);
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
          Browser: {browserInfo.name} {browserInfo.version}
        </li>
        <li>
          Webcam:{" "}
          {webcamEnabled !== null
            ? webcamEnabled
              ? "Enabled"
              : "Disabled"
            : "Checking..."}
        </li>
        <div>
          <ReactInternetSpeedMeter
            txtSubHeading="Internet connection is slow"
            outputType="" // "alert"/"modal"/"empty"
            customClassName={null}
            pingInterval={2000} // milliseconds
            txtMainHeading="Opps..."
            thresholdUnit="megabyte" // "byte" , "kilobyte", "megabyte"
            threshold={50}
            imageUrl="https://i.postimg.cc/sft772VP/speedometer.png"
            downloadSize="1561257" //bytes
            callbackFunctionOnNetworkDown={(data) =>
              console.log(`Internet speed : ${data}`)
            }
            callbackFunctionOnNetworkTest={(data) => setSpeedMbps(data)}
          />
        </div>
        <li>Internet Speed: {speedMbps} MB/s</li>
      </ul>
    </div>
  );
};

export default SystemCheck;
