import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FaceRecognitionComponent from "./components/face_verification";
import CombinedDetection from "./components/Detection";

function App() {
  return (
    <div>
      <CombinedDetection />
      <ToastContainer />
    </div>
  );
}

export default App;
