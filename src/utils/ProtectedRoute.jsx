import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = () => {
  const userStatus = useSelector((state) => state.user.isLoggedIn);

  if (!userStatus) {
    return <Navigate to="/register" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
