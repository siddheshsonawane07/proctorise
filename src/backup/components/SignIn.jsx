// import { useNavigate } from "react-router-dom";
// import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// import { auth } from "../utils/firebase-config";

// // import Webcam from "react-webcam";
// // import { getStorage, ref, getDownloadURL } from "firebase/storage";
// // import UploadImage from "../../components/UploadImage";
// // import Detection from "../../components/Detection";

// const SignIn = () => {
//   const navigate = useNavigate();

//   const handleGoogleSignIn = async () => {
//     try {
//       const provider = new GoogleAuthProvider();
//       const result = await signInWithPopup(auth, provider);
//       console.log(result.user.displayName);
//       navigate("/home");
//     } catch (error) {
//       console.error("Error signing in with Google:", error);
//     }
//   };

//   return (
//     <div>
//       <button onClick={handleGoogleSignIn}>Sign in with Google</button>
//     </div>
//   );
// };

// export default SignIn;
