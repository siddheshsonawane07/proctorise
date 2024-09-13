import React from "react";
import "./css/Home.css";
import { useSelector } from "react-redux";

const Home2 = () => {
  const displayName = useSelector((state) => state.user.displayName);

  return (
    <div className="home-2-horizontal-div-1">
      <div className="home-2-vertical-div-1">
        <h2>Instructions</h2>
        <ul className="home-2-instruction-lines">
          <li className="home-2-instructions">
            You must use a functioning webcam and microphone.
          </li>
          <li className="home-2-instructions">
            No cell phones or other secondary devices are allowed in the room or
            test area.
          </li>
          <li className="home-2-instructions">
            Your desk/table must be clear of any materials except your
            test-taking device.
          </li>
          <li className="home-2-instructions">
            No one else can be in the room with you during the test.
          </li>
          <li className="home-2-instructions">
            Talking is not permitted during the test.
          </li>
          <li className="home-2-instructions">
            The testing room must be well-lit, and you must be clearly visible.
          </li>
          <li className="home-2-instructions">
            Only one screen or monitor is allowed; no dual screens are
            permitted.
          </li>
          <li className="home-2-instructions">
            Do not leave the camera's field of view during the test.
          </li>
        </ul>
      </div>

      <div className="home-2-image-div">
        {/* <img
          className="home-2-uploadedimg"
          src={imageLink}
          alt="No photo uploaded for reference. Please click Upload Photo"
        /> */}
        {displayName}
      </div>
    </div>
  );
};

export default Home2;
