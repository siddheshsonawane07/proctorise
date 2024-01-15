import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Detection from "./components/Detection";
import UploadImage from "./components/uploadImage";

function App() {
  return (
    <div>
      {/* <UploadImage /> */}
      <Detection />
      <ToastContainer />
    </div>
  );
}

export default App;
