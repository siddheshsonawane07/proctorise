import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import PoseDetectionCanvas from "./components/posecanvas";

function App() {
  return (
    <div>
      <PoseDetectionCanvas />
      <ToastContainer />
    </div>
  );
}

export default App;
