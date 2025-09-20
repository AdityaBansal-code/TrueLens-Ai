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
  // Function to send content to API and get response
const fetchApiResponse = async (content: string): Promise<string> => {
  try {
    const response = await fetch("https://my-fastapi-service-gmhbrnblwa-uc.a.run.app/verifier", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      // MODIFICATION 1: Match the body structure your API expects.
      // We'll hardcode conversation_id and image_data for now as per your example.
      body: JSON.stringify({ 
        message: content,
        conversation_id: "ed42", // You might want to manage this dynamically later
        image_data: [] 
      })
    });

    if (!response.ok) {
        // Handle HTTP errors like 404 or 500
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // MODIFICATION 2: Get the message content from the 'response' field, not 'result'.
    return data.response || "No response content from API."; 

  } catch (error) {
    console.error("API Error:", error);
    // Ensure the error message is a string
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return `Error: ${errorMessage}`;
  }
};
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
    setIsTyping(false);
  };

  const getBotResponse = (content: string, type?: string): string => {
    if (type === "file" || type === "image") {
      return "I've received your file. Let me analyze it for potential misinformation... \n\nAnalysis complete! The content appears to be legitimate with a confidence score of 87%. I found no significant red flags or misleading information. Would you like a detailed breakdown?";
    }
    if (type === "voice") {
      return "I've processed your voice message. The transcribed content has been analyzed for factual accuracy. Initial assessment shows the claims are mostly accurate with minor clarifications needed. Would you like me to fact-check specific statements?";
    }
    
    // // text responses

    
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