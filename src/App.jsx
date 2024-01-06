import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Detection from "./components/Detection";

function App() {
  return (
    <div>
      <Detection />
      <ToastContainer />
    </div>
  );
}

export default App;
