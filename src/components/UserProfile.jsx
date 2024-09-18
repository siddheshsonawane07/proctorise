import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutSuccess } from "../redux/UserSlice";
import { persistor } from "../redux/store";
import { FaUserCog } from "react-icons/fa";

import "./css/Home.css";

const UserProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const photoURL = useSelector((state) => state.user.photoURL);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleLogoutButton = async () => {
    try {
      dispatch(logoutSuccess());
      // console.log("Clearing persisted state");
      await persistor.purge(); 
      // console.log("Persisted state cleared");
      navigate("/");
    } catch (error) {
      console.error("Error clearing persisted state:", error);
    }
  };

  return (
    <div className="home-2-user-profile">
      {photoURL ? (
        <img
          id="profPhoto"
          src={photoURL}
          onClick={toggleDropdown}
          className="home-2-user-profile-icon"
        />
      ) : (
        <FaUserCog
          onClick={toggleDropdown}
          className="home-2-user-profile-icon"
        />
      )}
      {dropdownVisible && (
        <div className="dropdown-menu">
          <ul>
            <li onClick={handleLogoutButton}>Logout</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
