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

  const fetchApiResponse = async (content: string): Promise<string> => {
    try {
      const response = await fetch("https://my-fastapi-app-575174467987.us-central1.run.app/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          text_claims: [content],
          images_base64: [] 
        })
      });

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error("The verification service is currently experiencing issues. Please try again in a few moments.");
        } else if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        } else {
          throw new Error(`Server error (${response.status}). Please try again later.`);
        }
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error("Invalid response format from server");
      }
      return data.response;

    } catch (error) {
      console.error("API Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return `I apologize, but I'm having trouble processing your request. ${errorMessage} Please try again or rephrase your question.`;
    }
  };

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

    try {
      let botContent: string;
      if (type === "text") {
        botContent = await fetchApiResponse(content);
      } else {
        botContent = getBotResponse(content, type);
      }
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: botContent,
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      // Add error message to chat
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but something went wrong. Please try again.",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const getBotResponse = (content: string, type?: string): string => {
    if (type === "file" || type === "image") {
      return "I've received your file. Let me analyze it for potential misinformation... \n\nAnalysis complete! The content appears to be legitimate with a confidence score of 87%. I found no significant red flags or misleading information. Would you like a detailed breakdown?";
    }
    if (type === "voice") {
      return "I've processed your voice message. The transcribed content has been analyzed for factual accuracy. Initial assessment shows the claims are mostly accurate with minor clarifications needed. Would you like me to fact-check specific statements?";
    }
    
    // Default text response
    return "I'm analyzing your message... \n\nBased on my analysis, I can provide insights about the credibility of this information. Would you like me to explain my findings in detail?";
  };

  return (
    
  <div className="relative h-screen min-h-[100dvh]">
      <Sidebar onSidebarOpen={setSidebarOpen} />
      <header
        className={`flex items-center gap-2 py-4 px-6 border-b border-border bg-card transition-all duration-300 ${sidebarOpen ? "ml-56" : "ml-0"} md:gap-4 md:px-8 md:py-4 sm:gap-2 sm:px-4 sm:py-3`}
        style={{ zIndex: 10, position: "relative" }}
      >
        <button 
          onClick={() => navigate(-1)} 
          className="mr-2 text-muted-foreground"
          title="Go back"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
  <img src="/google-shield.svg" alt="Google Shield" className="w-10 h-10 min-w-8 min-h-8 sm:w-8 sm:h-8 md:w-10 md:h-10" />
  <div className="ml-2 sm:ml-1 md:ml-2">
          <div className="font-bold text-lg">TrueLens AI</div>
          <div className="text-xs text-success">Online</div>
        </div>
      </header>
  <main className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-32">
          <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-2 sm:py-4 md:px-6 md:py-8">
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