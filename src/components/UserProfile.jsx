import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutSuccess } from "../redux/userSlice";
import { persistor } from "../redux/store";
import "./css/Home.css";

const UserProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const photoURL = useSelector((state) => state.user.photoURL);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleUpdateProfile = () => {
    navigate("/updateprofile");
  };

  const handleLogoutButton = async () => {
    try {
      dispatch(logoutSuccess()); // Clear user data in Redux store
      console.log("Clearing persisted state");
      await persistor.purge(); // Ensure purging completes
      console.log("Persisted state cleared");
      navigate("/"); // Redirect to home page
    } catch (error) {
      console.error("Error clearing persisted state:", error);
    }
  };

  return (
    <div className="home-2-user-profile">
      <img
        id="profPhoto"
        src={photoURL}
        alt="Profile"
        onClick={toggleDropdown}
      />
      {dropdownVisible && (
        <div className="dropdown-menu">
          <ul>
            <li onClick={handleUpdateProfile}>Update Profile</li>
            <li onClick={handleLogoutButton}>Logout</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
