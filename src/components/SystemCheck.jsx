import React, { useState, useEffect, useRef } from "react";
import { ReactInternetSpeedMeter } from "react-internet-meter";
import DetectRTC from "detectrtc";
import "./css/SystemCheck.css";

const SystemCheck = () => {
  const [browserInfo, setBrowserInfo] = useState({});
  const [webcamEnabled, setWebcamEnabled] = useState();
  const [internetSpeed, setInternetSpeed] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    const checkSystemInfo = () => {
      setBrowserInfo({
        name: DetectRTC.browser.name,
        version: DetectRTC.browser.version,
      });

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
    <div className=".detection-page-body">
    <div className="system-check-container">
      <h1 className="title">System Compatibility Check</h1>
      <ul className="check-list">
        <li>
          <span className="check-label">Browser:</span>{" "}
          {browserInfo.name} {browserInfo.version}
          {parseInt(browserInfo.version) >= 90 && (
            <span className="check-status">&#10004;</span>
          )}
        </li>
        <li>
          <span className="check-label">Webcam:</span>{" "}
          {webcamEnabled ? "Enabled" : "Disabled"}
          {webcamEnabled && (
            <span className="check-status">&#10004;</span>
          )}
        </li>
      </ul>
      <div className="internet-speed-check">
        <ReactInternetSpeedMeter
          txtSubHeading="Internet connection is slow"
          outputType=""
          customClassName="internet-speed-meter"
          pingInterval={5000}
          txtMainHeading="Internet Speed:"
          thresholdUnit="megabyte"
          threshold={100}
          imageUrl="https://www.lifewire.com/thmb/8yo0YsYWVIT1-U25jwT9XK5kNko=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/speed-test-580e7a2b5f9b58564ce47143.png"
          downloadSize="1561257"
          callbackFunctionOnNetworkTest={(data) => setInternetSpeed(data)}
        />
        <span className="internet-speed">{internetSpeed} Mbps</span>
      </div>
      <div className="camera-container">
        <h2>Live Camera Stream</h2>
        <video
          className="camera-stream"
          ref={videoRef}
          width="480"
          height="360"
          autoPlay
        ></video>
      </div>
    </div>
    </div>
  );
};

export default SystemCheck;
