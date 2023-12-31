import "./App.css";
// import Detection2 from "./components/Detection2";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Canvas from "./components/canvas";

function App() {
  return (
    <div>
      <Canvas />
      <ToastContainer />
    </div>
  );
}

export default App;
