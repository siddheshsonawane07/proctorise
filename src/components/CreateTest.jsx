import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../utils/firebase-config"; // Assuming you have a 'db' instance configured

const CreateTest = () => {
  const [values, setValues] = useState({
    formLink: "",
    testTime: "",
  });

  const navigate = useNavigate();

  const handleForm = async (e) => {
    e.preventDefault();

    if (!values.formLink || !values.testTime) {
      alert("Please fill in all fields");
      return;
    }

    try {
      // adding test details to firestore
      const docRef = await addDoc(collection(db, "testDetails"), values);
      console.log("Document written with ID: ", docRef.id);

      // Navigate to the "/home" route
      navigate("/home");
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={(e) => handleForm(e)}>
      <label htmlFor="formLink">Form Link:</label>
      <input
        type="text"
        name="formLink"
        value={values.formLink}
        onChange={(e) => handleChange(e)}
      />

      <label htmlFor="testTime">Test Time (in minutes):</label>
      <input
        type="text"
        name="testTime"
        value={values.testTime}
        onChange={(e) => handleChange(e)}
      />

      <button type="submit">Submit</button>
    </form>
  );
};

export default CreateTest;
