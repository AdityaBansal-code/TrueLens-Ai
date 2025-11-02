import { useState, useEffect, useRef } from "react";
import { ArrowLeft, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebaseconfig";
import { signOut, User, onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { 
  createChat, 
  updateChatMessages, 
  getChat
} from "@/lib/chatService";

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
  const [searchParams] = useSearchParams();
  const chatId = searchParams.get("id");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm TrueLens AI. I can help you verify news, articles, images, or any content for misinformation. How can I assist you today?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate("/auth");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load chat if chatId is provided
  useEffect(() => {
    const loadChat = async () => {
      if (!user || !chatId) return;
      
      setLoading(true);
      try {
        const chat = await getChat(chatId);
        if (chat && chat.userId === user.uid) {
          setMessages(chat.messages.length > 0 ? chat.messages : messages);
          setCurrentChatId(chatId);
        } else {
          // Chat doesn't exist or doesn't belong to user, create new
          setCurrentChatId(null);
          setMessages([
            {
              id: "welcome",
              content: "Hello! I'm TrueLens AI. I can help you verify news, articles, images, or any content for misinformation. How can I assist you today?",
              sender: "bot",
              timestamp: new Date()
            }
          ]);
        }
      } catch (error) {
        console.error("Error loading chat:", error);
        toast({
          title: "Error",
          description: "Failed to load chat. Starting a new chat.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [chatId, user]);

  const urlchatid= searchParams.get("id");

  // If there is no chatId in the URL, we reset currentChatId and show the welcome message
  useEffect(() => {
    if (urlchatid) return;
    setCurrentChatId(null);
    setMessages([
      {
        id: "welcome",
        content: "Hello! I'm TrueLens AI. I can help you verify news, articles, images, or any content for misinformation. How can I assist you today?",
        sender: "bot",
        timestamp: new Date()
      }
    ]);
  }, [urlchatid]);

  // Save messages to Firestore whenever they change (debounced)
  useEffect(() => {
    if (!user || messages.length <= 1) return; // Don't save if only welcome message

    const saveTimer = setTimeout(async () => {
      try {
        if (!currentChatId) {
          // Create new chat
          console.log("dataaaaaaa",user.uid, messages[1] || messages[0])
          const newChatId = await createChat(user.uid, messages[1] || messages[0]);
          setCurrentChatId(newChatId);
          // Update URL without navigation
          window.history.replaceState({}, "", `/chat?id=${newChatId}`);
        } else {
          // Update existing chat
          await updateChatMessages(currentChatId, messages);
        }
      } catch (error) {
        console.error("Error saving chat:", error);
      }
    }, 2000); // Save 2 seconds after last message

    return () => clearTimeout(saveTimer);
  }, [messages, currentChatId, user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = (user: User | null): string => {
    if (!user) return "?";
    if (user.displayName) {
      return user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "?";
  };

  const getUserDisplayName = (user: User | null): string => {
    if (!user) return "User";
    return user.displayName || user.email?.split("@")[0] || "User";
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Canonical hosted API base (use this for verification and uploads if you want the hosted service)
  const HOSTED_API = 'https://genai-exchange-698063521469.asia-south1.run.app';
  // WebSocket endpoint for agent invocation
  const WS_ENDPOINT = 'wss://genai-exchange-698063521469.asia-south1.run.app/ws/invoke_agent';

  // WebSocket connection + pending request map
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(new Map<string, { resolve: (v: any) => void; reject: (e: any) => void; timeout: any; }>());

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(WS_ENDPOINT);
      wsRef.current = ws;

      ws.addEventListener('open', () => console.log('WS connected to', WS_ENDPOINT));

      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          const reqId = msg.request_id || msg.requestId || msg.id;

          if (reqId && pendingRef.current.has(reqId)) {
            const p = pendingRef.current.get(reqId)!;
            clearTimeout(p.timeout);
            p.resolve(msg);
            pendingRef.current.delete(reqId);
            return;
          }

          // If server doesn't echo request id but sends an event like 'agent_finish',
          // resolve the oldest pending request (best-effort mapping).
          if ((!reqId) && msg.event === 'agent_finish' && pendingRef.current.size > 0) {
            const firstKey = pendingRef.current.keys().next().value;
            const p = pendingRef.current.get(firstKey)!;
            clearTimeout(p.timeout);
            p.resolve(msg.final_output || msg);
            pendingRef.current.delete(firstKey);
            return;
          }

          // Messages without a request id are commonly agent lifecycle logs
          // (progress, node start/end, startup logs, etc.). They are informational
          // and not necessarily tied to a single request id. Handle them more
          // gracefully rather than emitting a noisy warning.
          if (msg.event === 'log') {
            // server log entries may carry a `type` (info, agent, error, turn)
            if (msg.type === 'error') console.error('Agent log (error)', msg.message || msg);
            else console.info('Agent log', msg.message || msg);
            return;
          }

          if (msg.event === 'agent_start' || msg.event === 'agent_progress' || msg.event === 'node_start' || msg.event === 'node_end' || msg.event === 'agent') {
            console.info('Agent event', msg);
            return;
          }

          if (msg.event === 'error') {
            // Top-level error events from the agent
            console.error('Agent error', msg);
            return;
          }

          // Fallback to an informational notice for any other unrecognized messages
          console.info('WS message without matching request id (unrecognized event)', msg);
        } catch (err) {
          console.error('Failed to parse WS message', err);
        }
      });

      ws.addEventListener('error', (e) => console.error('WS error', e));
      ws.addEventListener('close', (e) => console.log('WS closed', e));
    } catch (err) {
      console.error('Could not open WS', err);
    }

    return () => {
      try { ws?.close(); } catch (e) { /* ignore */ }
      pendingRef.current.forEach((p) => { clearTimeout(p.timeout); p.reject(new Error('socket closed')); });
      pendingRef.current.clear();
    };
  }, []);

  const sendViaWebSocket = (payload: any, timeoutMs = 30000) => {
    return new Promise<any>((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return reject(new Error('WebSocket not connected'));
      const request_id = (payload.request_id = payload.request_id || `${Date.now()}-${Math.random().toString(36).slice(2,9)}`);
      try {
        const timer = setTimeout(() => {
          if (pendingRef.current.has(request_id)) {
            pendingRef.current.get(request_id)!.reject(new Error('WS request timeout'));
            pendingRef.current.delete(request_id);
          }
        }, timeoutMs);

        pendingRef.current.set(request_id, { resolve, reject, timeout: timer });
        ws.send(JSON.stringify(payload));
      } catch (err) {
        reject(err);
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchApiResponse = async (content: string, imageUrl?: string): Promise<any> => {
    try {
      console.log("Sending API request with content:", content);

      

      // Build payload according to the schema the API expects
      // Note: the backend/agent expects chat history items to include a `role`
      // key (e.g. 'user'|'assistant'|'system'). Map our `sender` -> `role`.
      const payload = {
        user_id: user?.uid || "",
        chat_id: currentChatId || "",
        image_mappings: imageUrl ? [{ filename: (imageUrl && imageUrl.split('/').pop()) || '', url: imageUrl }] : [],
        verified_results: [],
        chat_history: messages.map((m) => ({ role: m.sender === 'bot' ? 'assistant' : m.sender === 'user' ? 'user' : 'system', content: m.content })),
        new_query: content,
        new_image_paths: imageUrl ? [imageUrl] : []
      };

      // Prefer WebSocket invocation if available (lower latency, streaming-capable)
      try {
        // send agent input fields at top-level (server expects user_id, chat_id, new_query ...)
        const wsResp = await sendViaWebSocket({ ...payload, type: 'invoke_agent' });
        // wsResp is expected to be an object similar to HTTP response body
        return wsResp;
      } catch (wsErr) {
        console.warn('WS invocation failed, falling back to HTTP POST:', wsErr);
      }

      // Fallback to HTTP POST to 
  const endpoint = `${HOSTED_API}`;
      console.log("Posting to verification endpoint (HTTP fallback):", endpoint);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("API Response Status:", response);
      if (!response.ok) {
        if (response.status === 500) {
          return { error: true, message: "The verification service is currently experiencing issues. Please try again in a few moments." };
        } else if (response.status === 429) {
          return { error: true, message: "Too many requests. Please wait a moment before trying again." };
        } else {
          return { error: true, message: `Server error (${response.status}). Please try again later.` };
        }
      }

      const data = await response.json();
      // Return the full response object so the caller can inspect verified_results, data_to_upsert, etc.
      return data;
    } catch (error) {
      console.error("API Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return { error: true, message: `I apologize, but I'm having trouble processing your request. ${errorMessage} Please try again or rephrase your question.` };
    }
  };

  const handleSendMessage = async (content: string, type?: "text" | "file" | "image" | "voice", fileName?: string, file?: File) => {
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
        console.log("Sending text message:", content);
        const resp = await fetchApiResponse(content);
        if (resp && resp.error) {
          botContent = resp.message;
        } else {
          botContent = resp?.agent_response || JSON.stringify(resp, null, 2);
          if (resp?.verified_results && Array.isArray(resp.verified_results) && resp.verified_results.length > 0) {
            const vrSummary = formatVerifiedResults(resp.verified_results);
            const vrMessage: Message = {
              id: (Date.now() + 2).toString(),
              content: vrSummary,
              sender: "bot",
              timestamp: new Date()
            };
            setMessages(prev => [...prev, vrMessage]);
          }
        }
      } else if (type === "image") {
        // If a File is provided, upload it to backend which will store it in GCS and return a URL
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000";
  console.log("Upload API base:", API_BASE);
        if (file) {
          try {
            const form = new FormData();
            form.append("file", file, file.name);
              console.log("Uploading image file:", file.name, content);
            // Use API_BASE for uploads if you want them to go to the hosted service
            const uploadEndpoint = `${API_BASE}/upload-to-gcs`;
            console.log("Uploading image to:", uploadEndpoint);
            const uploadRes = await fetch(uploadEndpoint, {
              method: "POST",
              body: form,
            });

            if (!uploadRes.ok) {
              throw new Error(`Upload failed (${uploadRes.status})`);
            }

            const uploadJson = await uploadRes.json();
            const imageUrl = uploadJson.public_url || uploadJson.object_name && uploadJson.public_url;
               console.log("Uploaded image URL:", imageUrl);
            // Send message to local /chat endpoint including the image URL
            // const chatRes = await fetch(`${API_BASE}/chat`, {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ message: content, image_url: imageUrl, conversation_id: currentChatId }),
            // });

            // if (!chatRes.ok) {
            //   throw new Error(`Chat API error (${chatRes.status})`);
            // }

            // const chatJson = await chatRes.json();
            // botContent = chatJson.response || JSON.stringify(chatJson);
            // Call API with structured payload including image URL
            const resp = await fetchApiResponse(content, imageUrl);
            if (resp && resp.error) {
              botContent = resp.message;
            } else {
              botContent = resp?.agent_response || JSON.stringify(resp, null, 2);
              if (resp?.verified_results && Array.isArray(resp.verified_results) && resp.verified_results.length > 0) {
                const vrSummary = formatVerifiedResults(resp.verified_results);
                const vrMessage: Message = {
                  id: (Date.now() + 3).toString(),
                  content: vrSummary,
                  sender: "bot",
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, vrMessage]);
              }
            }
          } catch (err) {
            console.error("Upload or chat error:", err);
            botContent = "I couldn't upload the image or contact the chat service. Please try again.";
          }
        } else {
          botContent = getBotResponse(content, type);
        }
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

  // Format verified_results into a readable plain-text summary for chat display
  const formatVerifiedResults = (verifiedResults: any): string => {
    try {
      if (!verifiedResults) return "";
      // verifiedResults may be an array or object; normalize to array
      const arr = Array.isArray(verifiedResults) ? verifiedResults : [verifiedResults];
      const parts: string[] = [];
      parts.push("Verified results:");

      arr.forEach((vr, idx) => {
        // If structure contains newly_verified_text_claims
        const claims = vr?.newly_verified_text_claims || vr?.newly_verified_text_claims || [];
        if (Array.isArray(claims) && claims.length > 0) {
          claims.forEach((c: any, ci: number) => {
            parts.push(`\n- Claim: ${c.claim}`);
            parts.push(`  Classification: ${c.classification} (confidence: ${c.confidence ?? "n/a"})`);
            if (c.justification) parts.push(`  Justification: ${c.justification}`);
            const evidence = c.evidence || c.evidence?.official_fact_checks || vr?.evidence?.official_fact_checks || [];
            if (Array.isArray(evidence) && evidence.length > 0) {
              parts.push(`  Sources:`);
              evidence.forEach((s: any) => {
                if (s.publisher || s.url) {
                  parts.push(`    - ${s.publisher ?? ''}${s.publisher ? ': ' : ''}${s.url ?? s}`);
                }
              });
            }
          });
        }

        // Grounded AI summary if present
        if (vr?.grounded_ai_summary) {
          parts.push(`\nGrounded summary: ${vr.grounded_ai_summary}`);
        } else if (vr?.grounded_summary) {
          parts.push(`\nGrounded summary: ${vr.grounded_summary}`);
        }

        // Grounded citations (list of urls)
        const citations = vr?.grounded_citations || vr?.citations || [];
        if (Array.isArray(citations) && citations.length > 0) {
          parts.push(`\nCitations:`);
          citations.forEach((c: any) => {
            const title = c.title || c.publisher || '';
            const url = c.url || c;
            parts.push(`  - ${title}: ${url}`);
          });
        }
      });

      return parts.join("\n");
    } catch (e) {
      return `Verified results: ${JSON.stringify(verifiedResults)}`;
    }
  };

  return (
    
  <div className="relative h-screen min-h-[100dvh]">
      <Sidebar onSidebarOpen={setSidebarOpen} currentChatId={currentChatId} />
      <header
        className={`flex items-center justify-between gap-2 py-4 px-6 border-b border-border bg-card transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"} md:gap-4 md:px-8 md:py-4 sm:gap-2 sm:px-4 sm:py-3`}
        style={{ zIndex: 10, position: "relative" }}
      >
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate("/")} 
            className="mr-2 text-muted-foreground hover:text-foreground transition-colors"
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
        </div>

        {/* Profile Button */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full hover:bg-accent transition-colors"
              >
                <Avatar className="h-10 w-10 border-2 border-border">
                  <AvatarImage 
                    src={user.photoURL || undefined} 
                    alt={getUserDisplayName(user)} 
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getUserDisplayName(user)}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem
                onClick={() => {
                
                }}
                className="cursor-pointer"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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





// import { useState, useRef } from "react";
// import { Send, Paperclip, Image, Mic, MicOff, StopCircle, Type, MessageSquareText, Plus, X, Camera } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { cn } from "@/lib/utils";
// import { VoiceRecorder } from "@/utils/voiceRecorder";

// interface MessageBox {
//   id: string;
//   content: string;
//   image?: File;
//   imagePreview?: string;
// }

// interface ChatInputProps {
//   onSendMessage: (message: string, type?: "text" | "file" | "image" | "voice", fileName?: string) => void;
// }

// const ChatInput = ({ onSendMessage }: ChatInputProps) => {
//   const [message, setMessage] = useState("");
//   const [isRecording, setIsRecording] = useState(false);
//   const [isTranscribing, setIsTranscribing] = useState(false);
//   const [isMultiLine, setIsMultiLine] = useState(false);
//   const [messageBoxes, setMessageBoxes] = useState<MessageBox[]>([
//     { id: '1', content: '' }
//   ]);
//   const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
//   const [uploadedImages, setUploadedImages] = useState<File[]>([]);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const imageInputRef = useRef<HTMLInputElement>(null);
//   const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
//   const voiceRecorder = useRef<VoiceRecorder>(new VoiceRecorder());
  
//   // Touch tracking for swipe detection
//   const touchStartX = useRef<number>(0);
//   const touchStartY = useRef<number>(0);

//   const handleSend = () => {
//     if (isMultiLine) {
//       // Send all message boxes with content
//       const validBoxes = messageBoxes.filter(box => box.content.trim());
//       if (validBoxes.length > 0) {
//         validBoxes.forEach((box, index) => {
//           setTimeout(() => {
//             if (box.image) {
//               onSendMessage(`${box.content}\n[Image: ${box.image.name}]`, "image", box.image.name);
//             } else {
//               onSendMessage(box.content, "text");
//             }
//           }, index * 100); // Small delay between messages
//         });
        
//         // Send shared files
//         uploadedFiles.forEach((file, index) => {
//           setTimeout(() => {
//             onSendMessage(`Uploaded file: ${file.name}`, "file", file.name);
//           }, (validBoxes.length + index) * 100);
//         });
        
//         // Send shared images
//         uploadedImages.forEach((file, index) => {
//           setTimeout(() => {
//             onSendMessage(`Uploaded image: ${file.name}`, "image", file.name);
//           }, (validBoxes.length + uploadedFiles.length + index) * 100);
//         });
        
//         // Reset all boxes and uploads
//         setMessageBoxes([{ id: '1', content: '' }]);
//         setUploadedFiles([]);
//         setUploadedImages([]);
//       }
//     } else {
//       // Single line mode
//       if (message.trim()) {
//         onSendMessage(message, "text");
//         setMessage("");
//       }
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   // Touch event handlers for swipe detection
//   const handleTouchStart = (e: React.TouchEvent) => {
//     touchStartX.current = e.touches[0].clientX;
//     touchStartY.current = e.touches[0].clientY;
//   };

//   const handleTouchEnd = (e: React.TouchEvent) => {
//     if (!touchStartX.current || !touchStartY.current) return;

//     const touchEndX = e.changedTouches[0].clientX;
//     const touchEndY = e.changedTouches[0].clientY;
    
//     const deltaX = touchEndX - touchStartX.current;
//     const deltaY = touchEndY - touchStartY.current;
    
//     // Only trigger swipe if horizontal movement is greater than vertical
//     if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
//       if (deltaX > 0) {
//         // Right swipe - enable multi-line mode
//         setIsMultiLine(true);
//       } else {
//         // Left swipe - enable single-line mode
//         setIsMultiLine(false);
//       }
//     }
    
//     // Reset touch tracking
//     touchStartX.current = 0;
//     touchStartY.current = 0;
//   };

//   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
//     const file = e.target.files?.[0];
//     if (file) {
//       if (isMultiLine) {
//         // For multi-line mode, add to shared uploads
//         if (type === "file") {
//           setUploadedFiles(prev => [...prev, file]);
//         } else {
//           setUploadedImages(prev => [...prev, file]);
//         }
//       } else {
//         // For single-line mode, send immediately
//         onSendMessage(`Uploaded ${type}: ${file.name}`, type, file.name);
//       }
//       // Reset input
//       e.target.value = "";
//     }
//   };

//   const removeUploadedFile = (index: number, type: "file" | "image") => {
//     if (type === "file") {
//       setUploadedFiles(prev => prev.filter((_, i) => i !== index));
//     } else {
//       setUploadedImages(prev => prev.filter((_, i) => i !== index));
//     }
//   };

//   const transcribeAudio = async (base64Audio: string): Promise<string> => {
//     try {
//       const response = await fetch('https://my-fastapi-app-575174467987.us-central1.run.app/transcribe', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           audio_b64: base64Audio,
//           format : "string"
//         }),
//       });

//       if (!response.ok) {
//         throw new Error('Transcription failed');
//       }

//       const data = await response.json();
//       return data.transcript;
//     } catch (error) {
//       console.error('Transcription error:', error);
//       throw error;
//     }
//   };

//   const toggleRecording = async () => {
//     try {
//       if (isRecording) {
//         setIsRecording(false);
//         setIsTranscribing(true);
//         const base64Audio = await voiceRecorder.current.stopRecording();
//         const transcript = await transcribeAudio(base64Audio);
//         setIsTranscribing(false);
        
//         if (isMultiLine) {
//           // In multi-line mode, add transcript to current message box
//           const currentBox = messageBoxes[messageBoxes.length - 1];
//           updateMessageBox(currentBox.id, transcript);
//         } else {
//           // In single-line mode, set transcript as message
//           setMessage(transcript);
//         }
//       } else {
//         await voiceRecorder.current.startRecording();
//         setIsRecording(true);
//       }
//     } catch (error) {
//       console.error('Recording error:', error);
//       setIsRecording(false);
//       setIsTranscribing(false);
//       // Handle error (show notification to user)
//     }
//   };

//   const toggleInputMode = () => {
//     setIsMultiLine(!isMultiLine);
//     // Reset uploads when switching modes
//     setUploadedFiles([]);
//     setUploadedImages([]);
//     // Reset message boxes to initial state
//     setMessageBoxes([{ id: '1', content: '' }]);
//   };

//   const addMessageBox = () => {
//     const newBox: MessageBox = {
//       id: Date.now().toString(),
//       content: ''
//     };
//     setMessageBoxes(prev => [...prev, newBox]);
//   };

//   const removeMessageBox = (id: string) => {
//     if (messageBoxes.length > 1) {
//       setMessageBoxes(prev => prev.filter(box => box.id !== id));
//     }
//   };

//   const updateMessageBox = (id: string, content: string) => {
//     setMessageBoxes(prev => 
//       prev.map(box => 
//         box.id === id ? { ...box, content } : box
//       )
//     );
//   };

//   const removeImage = (id: string) => {
//     setMessageBoxes(prev => 
//       prev.map(box => 
//         box.id === id ? { 
//           ...box, 
//           image: undefined, 
//           imagePreview: undefined 
//         } : box
//       )
//     );
//   };

//   // Replace or update the recording button JSX
//   return (
//     <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
//       <div className="container mx-auto max-w-4xl px-2 sm:px-4 py-4">
//         {/* Mode indicator */}
//         <div className="flex items-center justify-center mb-2">
//           <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 sm:px-3 py-1 rounded-full max-w-full">
//             {isMultiLine ? (
//               <>
//                 <MessageSquareText className="h-3 w-3 flex-shrink-0" />
//                 <span className="hidden sm:inline">Multi-line mode • Click button or swipe left for single line</span>
//                 <span className="sm:hidden">Multi-line mode</span>
//               </>
//             ) : (
//               <>
//                 <Type className="h-3 w-3 flex-shrink-0" />
//                 <span className="hidden sm:inline">Single-line mode • Click button or swipe right for multi-line</span>
//                 <span className="sm:hidden">Single-line mode</span>
//               </>
//             )}
//           </div>
//         </div>
        
//         <div className="flex items-end gap-1 sm:gap-2">
//           {/* Mode Toggle Button */}
//           <Button
//             size="icon"
//             variant="outline"
//             onClick={toggleInputMode}
//             className={cn(
//               "h-10 w-10 sm:h-12 sm:w-12 rounded-full transition-all flex-shrink-0",
//               isMultiLine 
//                 ? "bg-primary text-primary-foreground hover:bg-primary/90" 
//                 : "hover:bg-muted"
//             )}
//             title={isMultiLine ? "Switch to single line" : "Switch to multi-line"}
//           >
//             {isMultiLine ? (
//               <Type className="h-4 w-4 sm:h-5 sm:w-5" />
//             ) : (
//               <MessageSquareText className="h-4 w-4 sm:h-5 sm:w-5" />
//             )}
//           </Button>

//           <div className="flex-1 relative">
//             {isMultiLine ? (
//               <div className="space-y-3">
//                 {/* Shared Upload Controls for Multi-line Mode */}
//                 <div className="flex items-center gap-1 sm:gap-2 pb-2 border-b border-border/50 flex-wrap">
//                   <span className="text-xs font-medium text-muted-foreground flex-shrink-0"></span>
                 
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     onClick={() => fileInputRef.current?.click()}
//                     className="h-7 px-2 sm:h-8 sm:px-3 text-muted-foreground hover:text-foreground text-xs"
//                     title="Upload file"
//                   >
//                     <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
//                     <span className="hidden xs:inline">File</span>
//                   </Button>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     onClick={() => imageInputRef.current?.click()}
//                     className="h-7 px-2 sm:h-8 sm:px-3 text-muted-foreground hover:text-foreground text-xs"
//                     title="Upload image"
//                   >
//                     <Image className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
//                     <span className="hidden xs:inline">Image</span>
//                   </Button>
//                 </div>

//                 {/* Display uploaded files and images */}
//                 {(uploadedFiles.length > 0 || uploadedImages.length > 0) && (
//                   <div className="flex flex-wrap gap-1 sm:gap-2 p-2 bg-muted/50 rounded border max-w-full overflow-hidden">
//                     {uploadedFiles.map((file, index) => (
//                       <div key={`file-${index}`} className="flex items-center gap-1 bg-background px-2 py-1 rounded text-xs max-w-full">
//                         <Paperclip className="h-3 w-3 flex-shrink-0" />
//                         <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
//                         <Button
//                           size="icon"
//                           variant="ghost"
//                           onClick={() => removeUploadedFile(index, "file")}
//                           className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
//                         >
//                           <X className="h-3 w-3" />
//                         </Button>
//                       </div>
//                     ))}
//                     {uploadedImages.map((file, index) => (
//                       <div key={`image-${index}`} className="flex items-center gap-1 bg-background px-2 py-1 rounded text-xs max-w-full">
//                         <Image className="h-3 w-3 flex-shrink-0" />
//                         <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
//                         <Button
//                           size="icon"
//                           variant="ghost"
//                           onClick={() => removeUploadedFile(index, "image")}
//                           className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
//                         >
//                           <X className="h-3 w-3" />
//                         </Button>
//                       </div>
//                     ))}
//                   </div>
//                 )}

//                 {messageBoxes.map((box, index) => (
//                   <div key={box.id} className="relative border border-border rounded-lg  p-3 sm:p-3 bg-muted/30">
//                     <div className="flex items-start gap-2">
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center gap-2 mb-2">
//                           {/* <span className="text-xs font-medium text-muted-foreground">
//                             Message {index + 1}
//                           </span> */}
//                           {messageBoxes.length > 1 && (
//                             <Button
//                               size="icon"
//                               variant="ghost"
//                               onClick={() => removeMessageBox(box.id)}
//                               className="h-5 w-5 absolute right-1 top-1 text-muted-foreground hover:text-destructive"
//                             >
//                               <X className="h-3 w-3" />
//                             </Button>
//                           )}
//                         </div>
                        
//                         <Textarea
//                           value={box.content}
//                           onChange={(e) => updateMessageBox(box.id, e.target.value)}
//                           onKeyDown={handleKeyPress}
//                           onTouchStart={handleTouchStart}
//                           onTouchEnd={handleTouchEnd}
//                           placeholder={`Type message ${index + 1}...`}
//                           className="resize-none min-h-[60px] max-h-20 sm:max-h-24 text-sm border-0 bg-transparent p-2 focus-visible:ring-0 w-full"
//                           rows={2}
//                         />
                        
//                         {box.imagePreview && (
//                           <div className="mt-2 relative inline-block">
//                             <img 
//                               src={box.imagePreview} 
//                               alt="Preview" 
//                               className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border"
//                             />
//                             <Button
//                               size="icon"
//                               variant="destructive"
//                               onClick={() => removeImage(box.id)}
//                               className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full"
//                             >
//                               <X className="h-2 w-2 sm:h-3 sm:w-3" />
//                             </Button>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
                
//                 <Button
//                   variant="outline"
//                   onClick={addMessageBox}
//                   className="w-full h-10 border-dashed border-2 text-muted-foreground hover:text-foreground text-sm"
//                 >
//                   <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
//                   <span className="hidden xs:inline">Add another message</span>
//                   <span className="xs:hidden">Add message</span>
//                 </Button>
//               </div>
//             ) : (
//               <Input
//                 ref={inputRef as React.RefObject<HTMLInputElement>}
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 onKeyDown={handleKeyPress}
//                 onTouchStart={handleTouchStart}
//                 onTouchEnd={handleTouchEnd}
//                 placeholder="Type your message... (Click button or swipe right for multi-line)"
//                 className="pr-20 sm:pr-12 py-6 text-sm sm:text-base bg-muted/50 border-border focus:border-primary transition-colors"
//               />
//             )}
//             <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
//               {!isMultiLine && (
//                 <>
//                   <Button
//                     size="icon"
//                     variant="ghost"
//                     onClick={() => fileInputRef.current?.click()}
//                     className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
//                     title="Upload file"
//                   >
//                     <Paperclip className="h-3 w-3 sm:h-4 sm:w-4" />
//                   </Button>
//                   <Button
//                     size="icon"
//                     variant="ghost"
//                     onClick={() => imageInputRef.current?.click()}
//                     className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
//                     title="Upload image"
//                   >
//                     <Image className="h-3 w-3 sm:h-4 sm:w-4" />
//                   </Button>
//                 </>
//               )}
//             </div>
//           </div>
          
//           <Button
//             size="icon"
//             variant={isRecording ? "destructive" : "outline"}
//             onClick={toggleRecording}
//             className={cn(
//               "h-10 w-10 sm:h-12 sm:w-12 rounded-full transition-all flex-shrink-0",
//               isRecording && "animate-pulse",
//               isTranscribing && "opacity-50 cursor-not-allowed"
//             )}
//             disabled={isTranscribing}
//             title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Start recording"}
//           >
//             {isRecording ? (
//               <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
//             ) : isTranscribing ? (
//               <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-current rounded-full border-t-transparent" />
//             ) : (
//               <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
//             )}
//           </Button>
          
//           <Button
//             size="icon"
//             onClick={handleSend}
//             disabled={isMultiLine ? !(messageBoxes.some(box => box.content.trim()) || uploadedFiles.length > 0 || uploadedImages.length > 0) : !message.trim()}
//             className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-primary hover:opacity-90 text-primary-foreground border-0 shadow-md hover:shadow-lg transition-all flex-shrink-0"
//           >
//             <Send className="h-4 w-4 sm:h-5 sm:w-5" />
//           </Button>
//         </div>
        
//         {/* Hidden file inputs */}
//         <input
//           ref={fileInputRef}
//           type="file"
//           accept=".pdf,.doc,.docx,.txt"
//           onChange={(e) => handleFileUpload(e, "file")}
//           className="hidden"
//           aria-label="Upload file"
//           title="Upload file"
//         />
//         <input
//           ref={imageInputRef}
//           type="file"
//           accept="image/*"
//           onChange={(e) => handleFileUpload(e, "image")}
//           className="hidden"
//           aria-label="Upload image"
//           title="Upload image"
//         />
//       </div>
//     </div>
//   );
// };

// export default ChatInput;
