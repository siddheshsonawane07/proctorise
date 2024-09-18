import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db, storage } from "../utils/FirebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";
import { useSelector } from "react-redux";
import "./css/Home.css";

const AttemptTest = () => {
  const [formLink, setFormLink] = useState("");
  const userEmail = useSelector((state) => state.user.email);
  const userName = useSelector((state) => state.user.displayName);
  const navigate = useNavigate();

  const handleForm = async (e) => {
    e.preventDefault();

    if (!formLink) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const formLinkQuery = query(
        collection(db, "testDetails"),
        where("formLink", "==", formLink)
      );

      const existingDocs = await getDocs(formLinkQuery);
      const labels = [`${userName}`];
      const storageRef = ref(storage, `/images/${userEmail}`);
      const imageLink = await getDownloadURL(storageRef);

      if (existingDocs.size > 0) {
        existingDocs.forEach((doc) => {
          const { testTime } = doc.data();
          console.log("Test Time:", testTime);
          setFormLink(formLink);
          // setTestTime(testTime);
          navigate("/test", {
            state: { formLink, testTime, imageLink, labels },
          });
        });
      } else {
        alert("Form link not found in the database");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleChange = (e) => {
    if (e.target.name === "formLink") {
      setFormLink(e.target.value);
    }
  };

  return (
    <div className="test-form-container">
      <form className="test-form" onSubmit={handleForm}>
        <label htmlFor="formLink">Form Link:</label>
        <input
          type="text"
          name="formLink"
          value={formLink}
          onChange={handleChange}
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default AttemptTest;
