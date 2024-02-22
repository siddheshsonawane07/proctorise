const AttemptTest = () => {
  const handleform = async (e) => {
    e.preventDefault();

    if (!values.formLink) {
      alert("Please fill in all fields");
      return;
    }

    
  };

  return (
    <div>
      <form onSubmit={(e) => handleform(e)}>
        <label htmlFor="formLink">Form Link:</label>
        <input
          type="text"
          name="formLink"
          value={values.formLink}
          onChange={(e) => handleChange(e)}
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default AttemptTest;
