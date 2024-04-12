import React, { useState } from "react";
import axios from "axios";

const QnAComponent = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "https://proctoriseqna.cognitiveservices.azure.com/language/:query-knowledgebases?projectName=proctorisecustomquestionanswering&api-version=2021-10-01&deploymentName=production",
        {
          question: question,
        },
        {
          headers: {
            "Ocp-Apim-Subscription-Key": "2f27e7f279ff487799ad2dc5762378a9",
            "Content-Type": "application/json",
          },
        }
      );
      const answerData = response.data.answers[0];
      setAnswer(answerData.answer);
      setError("");
    } catch (error) {
      console.error("Error fetching data:", error);
      setAnswer("");
      setError("Error fetching data. Please try again.");
    }
  };

  const handleChange = (e) => {
    setQuestion(e.target.value);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          Enter Your Question:
          <input
            type="text"
            value={question}
            onChange={handleChange}
            required
          />
        </label>
        <button type="submit">Get Answer</button>
      </form>
      {error && <p>{error}</p>}
      {answer && (
        <div>
          <h2>Question: {question}</h2>
          <p>Answer: {answer}</p>
        </div>
      )}
    </div>
  );
};

export default QnAComponent;
