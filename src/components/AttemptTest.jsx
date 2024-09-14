import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../utils/FirebaseConfig";

const AttemptTest = () => {
  const [formLink, setFormLink] = useState("");
  const profilePhoto = localStorage.getItem("user_photo");
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

      if (existingDocs.size > 0) {
        existingDocs.forEach((doc) => {
          const { testTime } = doc.data();
          console.log("Test Time:", testTime);
          setFormLink(formLink);
          // setTestTime(testTime);
          navigate("/test", { state: { formLink, testTime } });
        });
      } else {
        console.log("Form link not found in Firestore");
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
    <div>
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
