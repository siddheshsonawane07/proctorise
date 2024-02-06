import React from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Notification = ({ message }) => {
  const notify = () => toast.info(message);

  return (
    <div>
      <button onClick={notify} style={{ display: "none" }}>
        Show Toast
      </button>
    </div>
  );
};

export default Notification;
