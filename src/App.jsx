import React, { Component } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import PageNotFound from "./components/404";
import Home from "./components/Home";
import Home2 from "./components/Home2";
import SystemCheck from "./components/SystemCheck";
import DetectionCheck from "./components/DetectionCheck";
import TestPage from "./components/TestPage";
import UploadImage from "./components/UploadImage";
import CreateTest from "./components/CreateTest";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AttemptTest from "./components/AttemptTest";

class App extends Component {
  render() {
    return (
      <div>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home2 />} />
            <Route path="/systemcheck" element={<SystemCheck />} />
            <Route path="/detectioncheck" element={<DetectionCheck />} />
            <Route path="/uploadimage" element={<UploadImage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/createtest" element={<CreateTest />} />
            <Route path="/attempttest" element={<AttemptTest />} />
            <Route path="/404" element={<PageNotFound />} />
            <Route path="*" element={<Navigate to="/404" />} />
          </Routes>
        </Router>
        <ToastContainer />
      </div>
    );
  }
}

export default App;
