import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ExamMonitoring from "./components/face_verification";
function App() {
  return (
    <div>
      <ExamMonitoring />
      <ToastContainer />
    </div>
  );
}

export default App;
