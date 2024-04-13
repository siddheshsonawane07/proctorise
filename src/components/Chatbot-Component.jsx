import React, { useState } from "react";
import axios from "axios";
import "./css/Home.css";
import { FaCommentAlt } from "react-icons/fa";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

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
      const newMessage = { text: question, sender: "user" };
      const botResponse = { text: answerData.answer, sender: "bot" };
      setMessages([...messages, newMessage, botResponse]);
      setQuestion("");
      setError("");
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error fetching data. Please try again.");
    }
  };

  const handleChange = (e) => {
    setQuestion(e.target.value);
  };

  const toggleChatbox = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`chatbot-container ${isOpen ? "open" : ""}`}>
      <div className="chatbot-toggle-icon" onClick={toggleChatbox}>
        <FaCommentAlt />
      </div>
      <div className="chatbot-content">
        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              {message.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={question}
            onChange={handleChange}
            placeholder="Type your question..."
            required
          />
          <button type="submit">Send</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};

export default Chatbot;
