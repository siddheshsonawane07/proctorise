// import React, { useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuthState } from "react-firebase-hooks/auth";
// import { auth } from "../../utils/firebase-config";

// const RedirectComponent = () => {
//   const navigate = useNavigate();
//   const [user] = useAuthState(auth);

//   useEffect(() => {
//     const checkAuthentication = async () => {
//       if (user == null) {
//         navigate("/signin");
//       } else {
//         navigate("/home");
//       }
//     };

//     checkAuthentication();
//   }, [navigate]);

//   return (
//     <div>
//       {/* need to add a loading spinner */}
//       <p>Redirecting...</p>
//     </div>
//   );
// };

// export default RedirectComponent;
