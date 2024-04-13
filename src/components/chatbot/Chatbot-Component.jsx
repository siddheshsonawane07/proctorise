import Chatbot from "react-chatbot-kit";
import "react-chatbot-kit/build/main.css";

import config from "./Config";
import MessageParser from "./MessageParser";
import ActionProvider from "./ActionProvider";

const ChatbotComponent = () => {
  return (
    <Chatbot
      config={config}
      messageParser={MessageParser}
      actionProvider={ActionProvider}
    />
  );
};

export default ChatbotComponent;
