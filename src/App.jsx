import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ObjectDetectionCanvas from "./components/objectcanvas";
import PoseCanvas from "./components/posecanvas";

function App() {
  return (
    <div>
      <PoseCanvas />
      <ToastContainer />
    </div>
  );
}

export default App;
