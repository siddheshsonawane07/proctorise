import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../components/Header";

const ProtectedRoute = () => {
  const userStatus = useSelector((state) => state.user.isLoggedIn);

  if (!userStatus) {
    return <Navigate to="/register" replace />;
  }

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};

export default ProtectedRoute;
