import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import { appStore, persistor } from "./redux/store.jsx";
import Home from "./components/Home.jsx";
import Home2 from "./components/Home2.jsx";
import LoginSignup from "./components/LoginSignup.jsx";
import ProtectedRoute from "./utils/ProtectedRoute.jsx";
import CreateTest from "./components/CreateTest.jsx";
import UploadImage from "./components/UploadImage.jsx";
import AttemptTest from "./components/AttemptTest.jsx";
import TestPage from "./components/TestPage.jsx";
import SystemCheck from "./components/SystemCheck.jsx";
import App from "./App";
import "./components/css/Home.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />,
        index: true,
      },
      {
        path: "/register",
        element: <LoginSignup />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/home",
            element: <Home2 />,
          },
          {
            path: "/createtest",
            element: <CreateTest />,
          },
          {
            path: "/attempttest",
            element: <AttemptTest />,
          },
          {
            path: "/systemcheck",
            element: <SystemCheck />,
          },
          {
            path: "/uploadimage",
            element: <UploadImage />,
          },
          {
            path: "/test",
            element: <TestPage />,
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={appStore}>
    <PersistGate loading={null} persistor={persistor}>
      <RouterProvider router={router} />
      <ToastContainer />
    </PersistGate>
  </Provider>
);
