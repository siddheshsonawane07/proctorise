import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CreateTest = () => {
  const [values, setValues] = useState({
    formLink: "",
    testTime: "",
  });

  const navigate = useNavigate();

  const handleForm = (e) => {
    e.preventDefault();
    localStorage.setItem("testDetails", JSON.stringify(values));
    // console.log(values);
    navigate("/home");
  };

  const test = localStorage.getItem("testDetails");
  //   console.log(test);

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={(e) => handleForm(e)}>
      <input
        type="text"
        name="formLink"
        onChange={(e) => {
          handleChange(e);
        }}
      />
      <input
        type="text"
        name="testTime"
        onChange={(e) => {
          handleChange(e);
        }}
      />
      <button type="submit">Submit</button>
    </form>
  );
};

export default CreateTest;
