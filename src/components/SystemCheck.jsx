import React, { useEffect, useState, useRef } from "react";
import { ReactInternetSpeedMeter } from "react-internet-meter";
import DetectRTC from "detectrtc";

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
    <div>
      <h1>System Compatibility Check</h1>
      <ul>
        <li>
          Browser: {browserInfo.name} {browserInfo.version}
        </li>
        <li>Webcam: {webcamEnabled === true ? "Enabled" : "Disabled"}</li>
        <div>
          <ReactInternetSpeedMeter
            txtSubHeading="Internet connection is slow"
            outputType=""
            customClassName={null}
            pingInterval={2000}
            txtMainHeading="Opps..."
            thresholdUnit="megabyte"
            threshold={50}
            imageUrl="https://i.postimg.cc/sft772VP/speedometer.png"
            downloadSize="1561257"
            callbackFunctionOnNetworkTest={(data) => setSpeedMbps(data)}
          />
        </div>
        <li>Internet Speed: {speedMbps} MB/s</li>
      </ul>
      <video ref={videoRef} width="480" height="480" autoPlay></video>
    </div>
  );
};

export default SystemCheck;
