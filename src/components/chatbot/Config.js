import { createChatBotMessage } from "react-chatbot-kit";

const config = {
  initialMessages: [
    createChatBotMessage(
      `Hi there, I'm Pixel, your virtual assistant here to help you with any questions or assistance you need during your exam process. Feel free to ask me anything related to online proctoring, exam security, or any other queries you may have. Let's ensure a smooth and secure exam experience together!`
    ),
  ],
};

export default config;
