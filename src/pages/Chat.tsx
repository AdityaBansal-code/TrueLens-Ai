import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "file" | "image" | "voice";
  fileName?: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm TrueLens AI. I can help you verify news, articles, images, or any content for misinformation. How can I assist you today?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string, type?: "text" | "file" | "image" | "voice", fileName?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
      type: type || "text",
      fileName
    };

    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);

    // Simulate API call
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: getBotResponse(content, type),
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getBotResponse = (content: string, type?: string): string => {
    if (type === "file" || type === "image") {
      return "I've received your file. Let me analyze it for potential misinformation... \n\nAnalysis complete! The content appears to be legitimate with a confidence score of 87%. I found no significant red flags or misleading information. Would you like a detailed breakdown?";
    }
    if (type === "voice") {
      return "I've processed your voice message. The transcribed content has been analyzed for factual accuracy. Initial assessment shows the claims are mostly accurate with minor clarifications needed. Would you like me to fact-check specific statements?";
    }
    
    // Simple keyword-based responses for demo
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes("fake") || lowerContent.includes("false")) {
      return "Based on my analysis, this content contains several red flags commonly associated with misinformation:\n\n• Unverified sources\n• Emotional language\n• Lack of supporting evidence\n\nConfidence: 92% likely to be false. Would you like me to provide fact-checked alternatives?";
    }
    if (lowerContent.includes("true") || lowerContent.includes("verify")) {
      return "I'll analyze this for you. My preliminary assessment shows:\n\n✅ Credible sources cited\n✅ Factual claims align with verified data\n✅ No misleading context detected\n\nConfidence: 88% likely to be accurate. Need more specific analysis?";
    }
    
    return "I'm analyzing your query for potential misinformation. Please provide more context or specific content you'd like me to verify. I can check news articles, social media posts, images, or documents for factual accuracy.";
  };

  return (
    <div className="relative h-screen">
      <Sidebar onSidebarOpen={setSidebarOpen} />
      <header
        className={`flex items-center gap-2 py-4 px-6 border-b border-border bg-card transition-all duration-300 ${sidebarOpen ? "ml-72" : "ml-0"}`}
        style={{ zIndex: 10, position: "relative" }}
      >
        <button onClick={() => navigate(-1)} className="mr-2 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
  <img src="/google-shield.svg" alt="Google Shield" className="w-10 h-10" />
        <div className="ml-2">
          <div className="font-bold text-lg">TrueLens AI</div>
          <div className="text-xs text-success">Online</div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-32">
          <div className="container mx-auto max-w-4xl px-4 py-8">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
                <span className="text-sm">TrueLens is analyzing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput onSendMessage={handleSendMessage} />
      </main>
    </div>
  );
};

export default Chat;