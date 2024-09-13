import React from "react";
import ReactDOM from "react-dom/client";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import { appStore, persistor } from "./redux/store.jsx";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  // <RouterProvider router={router} />

  <Provider store={appStore}>
    <PersistGate loading={null} persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>
);
