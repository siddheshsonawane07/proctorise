import React, { useState, useEffect, useRef } from "react";
import { ReactInternetSpeedMeter } from "react-internet-meter";
import DetectRTC from "detectrtc";
import "./css/Home.css";

const SystemCheck = () => {
  const [browserInfo, setBrowserInfo] = useState({});
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [internetSpeed, setInternetSpeed] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const checkSystemInfo = () => {
      setBrowserInfo({
        name: DetectRTC.browser.name,
        version: DetectRTC.browser.version,
      });

      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          setWebcamEnabled(true);
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => setWebcamEnabled(false));
    };

    checkSystemInfo();

    return () => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="system-check-body">
      <div className="system-check-container">
        <ul className="system-check-list">
          <li>
            <div className="system-check-label">Browser:</div>
            <div
              className={
                parseInt(browserInfo.version) >= 90 ? "system-check-green" : ""
              }
            >
              {browserInfo.name} {browserInfo.version}
            </div>
          </li>
          <li>
            <div className="system-check-label">Webcam:</div>
            <div className={webcamEnabled ? "system-check-green" : ""}>
              {webcamEnabled ? "Enabled" : "Disabled"}
            </div>
          </li>
          <li>
            <ReactInternetSpeedMeter
              txtSubHeading="Internet connection is slow"
              outputType=""
              pingInterval={5000}
              txtMainHeading="Internet Speed:"
              thresholdUnit="megabyte"
              threshold={100}
              imageUrl="https://www.lifewire.com/thmb/8yo0YsYWVIT1-U25jwT9XK5kNko=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/speed-test-580e7a2b5f9b58564ce47143.png"
              downloadSize="1561257"
              callbackFunctionOnNetworkTest={(data) => setInternetSpeed(data)}
            />
            <div className="system-check-label">Internet Speed:</div>
            <div className="system-check-green">{internetSpeed} Mbps</div>
          </li>
        </ul>
        <div className="system-camera-container">
          <div className="system-check-label">Live Camera Stream</div>
          <video
            className="system-camera-stream"
            ref={videoRef}
            autoPlay
            style={{
              width: "100%",
              maxWidth: "480px",
              height: "auto",
              borderRadius: "10px",
            }}
          ></video>
        </div>
      </div>
    </div>
  );
};

export default SystemCheck;
