import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FaceRecognitionComponent from "./components/face_verification";

function App() {
  return (
    <div>
      <FaceRecognitionComponent />
      <ToastContainer />
    </div>
  );
}

export default App;
