// import "./App.css";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import Detection from "./components/Detection";
// import UploadImage from "./components/uploadImage";

// function App() {
//   return (
//     <div>
//       {/* <UploadImage /> */}
//       <Detection />
//       <ToastContainer />
//     </div>
//   );
// }

// export default App;

// App.js
// import React, { useRef } from "react";
// import { auth } from "./utils/firebase-config";
// import { AuthProvider } from "./utils/auth_handler";
// import UploadImage from "./components/UploadImage";
// import MainPage from "./components/Home";

// const App = () => {
//   const webcamRef = useRef(null);
//   return (
//     <AuthProvider>
//       {({ user }) => (
//         <div>
//           <h1>My App</h1>
//           {user ? (
//             <UploadImage webcamRef={webcamRef} />
//           ) : (
//             <p>Please sign in to use the app.</p>
//           )}
//         </div>
//       )}
//     </AuthProvider>
//   );
// };

import React, { Component } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import PageNotFound from "./components/404";
import AuthProvider from "./utils/auth_handler";

class App extends Component {
  render() {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<AuthProvider />} />

          <Route path="/404" element={<PageNotFound />} />
          <Route path="*" element={<Navigate to="/404" />} />
        </Routes>
      </Router>
    );
  }
}

export default App;
