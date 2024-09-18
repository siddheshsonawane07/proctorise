import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import { appStore, persistor } from "./redux/store.jsx";
import App from "./App.jsx";
import Home from "./components/Home.jsx";
import Home2 from "./components/Home2.jsx";
import LoginSignup from "./components/LoginSignup.jsx";
import ProtectedRoute from "./utils/ProtectedRoute.jsx";
import CreateTest from "./components/CreateTest.jsx";
import AttemptTest from "./components/AttemptTest.jsx";
import "./components/css/Home.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loader from "./components/Loader.jsx";

const UploadImage = lazy(() => import("./components/UploadImage.jsx"));
const SystemCheck = lazy(() => import("./components/SystemCheck.jsx"));
const TestPage = lazy(() => import("./components/TestPage"));

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
            element: (
              <Suspense fallback={<Loader />}>
                <AttemptTest />
              </Suspense>
            ),
          },
          {
            path: "/systemcheck",
            element: (
              <Suspense fallback={<Loader />}>
                <SystemCheck />
              </Suspense>
            ),
          },
          {
            path: "/uploadimage",
            element: (
              <Suspense fallback={<Loader />}>
                <UploadImage />
              </Suspense>
            ),
          },
          {
            path: "/test",
            element: (
              <Suspense fallback={<Loader />}>
                <TestPage />
              </Suspense>
            ),
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
