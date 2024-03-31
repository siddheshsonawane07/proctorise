import React, { useEffect, useState, useRef } from "react";
import { ReactInternetSpeedMeter } from "react-internet-meter";
import DetectRTC from "detectrtc";
import "./css/SystemCheck.css";

const SystemCheck = () => {
  const [browserInfo, setBrowserInfo] = useState({});
  const [speedMbps, setSpeedMbps] = useState([0]);
  const [webcamEnabled, setWebcamEnabled] = useState();
  const videoRef = useRef(null);

  useEffect(() => {
    const checkSystemInfo = () => {
      setBrowserInfo({
        name: DetectRTC.browser.name,
        version: DetectRTC.browser.version,
      });

      // Check webcam permissions using navigator.mediaDevices.getUserMedia
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => setWebcamEnabled(true))
        .catch(() => setWebcamEnabled(false));
    };

    checkSystemInfo();
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current) {
        const stream = videoRef.current.srcObject;
        if (stream) {
          const tracks = stream.getTracks();
          tracks.forEach((track) => track.stop());
        }
      }
    };
  }, []);

  return (
    <div className="SysCheckContainer">
      <h1 className="titleSC">System Compatibility Check</h1>
      <ul className="SysCompatibilityCompo">
        <li>
          Browser: {browserInfo.name} {browserInfo.version}
        </li>
        <li>Webcam: {webcamEnabled === true ? "Enabled" : "Disabled"}</li>
        <div>
          <ReactInternetSpeedMeter
            txtSubHeading="Internet connection is slow"
            outputType=""
            customClassName={null}
            pingInterval={5000}
            txtMainHeading="Opps..."
            thresholdUnit="megabyte"
            threshold={100}
            // can add a static imageURL
            imageUrl="https://www.lifewire.com/thmb/8yo0YsYWVIT1-U25jwT9XK5kNko=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/speed-test-580e7a2b5f9b58564ce47143.png"
            downloadSize="1561257"
            callbackFunctionOnNetworkTest={(data) => setSpeedMbps(data)}
          />
        </div>
        <li>Internet Speed: {speedMbps} Mbps</li>
      </ul>
      <video
        className="SCVideo"
        ref={videoRef}
        width="480"
        height="480"
        autoPlay
      ></video>
    </div>
  );
};

export default SystemCheck;
