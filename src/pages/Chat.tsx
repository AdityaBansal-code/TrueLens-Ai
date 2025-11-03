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
  type?: "text" | "file" | "image" | "voice" | "verified";
  fileName?: string;
  meta?: any; // additional structured payload (e.g., verified_results)
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

  // Generate a compact unique id for messages to avoid duplicate React keys
  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

  // Canonical hosted API base (use this for verification and uploads if you want the hosted service)
  const HOSTED_API = 'https://genai-exchange-698063521469.asia-south1.run.app';
  // WebSocket endpoint for agent invocation
  const WS_ENDPOINT = 'wss://genai-exchange-698063521469.asia-south1.run.app/ws/invoke_agent';

  // WebSocket connection + pending request map
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(new Map<string, { resolve: (v: any) => void; reject: (e: any) => void; timeout: any; }>());
  // Collect per-request agent logs so we can show "what the model is thinking"
  const pendingLogsRef = useRef(new Map<string, string[]>());
  // Live logs state to render streaming AI thoughts (triggers re-render)
  const [liveLogs, setLiveLogs] = useState<Record<string, string[]>>({});
  // Keep timers for auto-removal of live log lines per request
  const liveLogTimersRef = useRef(new Map<string, any[]>());

  // WebSocket connection management with reconnect/backoff
  useEffect(() => {
    const mounted = { current: true } as { current: boolean };
    const reconnectRef = { current: 0 } as { current: number };

    const createWebSocket = () => {
      try {
        const ws = new WebSocket(WS_ENDPOINT);
        wsRef.current = ws;

        ws.addEventListener('open', () => {
          console.log('WS connected to', WS_ENDPOINT);
          reconnectRef.current = 0; // reset backoff
        });

        ws.addEventListener('message', (ev) => {
          try {
            const msg = JSON.parse(ev.data as string);
            const reqId = msg.request_id || msg.requestId || msg.id;

                if (reqId && pendingRef.current.has(reqId)) {
                  // collect logs for this request and update live UI
                  if (msg.event === 'log' || msg.event === 'node_start' || msg.event === 'node_end' || msg.event === 'agent' || msg.event === 'state_update' || msg.event === 'node_output') {
                    const line = msg.message ? String(msg.message) : JSON.stringify(msg);
                    const prev = pendingLogsRef.current.get(reqId) || [];
                    pendingLogsRef.current.set(reqId, [...prev, line]);

                    // update live React state so UI shows lines as they arrive
                    setLiveLogs((s) => {
                      const nextArr = [...(s[reqId] || []), line];
                      return { ...s, [reqId]: nextArr };
                    });

                    // schedule auto-removal of this line after 2.5s so lines disappear one-by-one
                    const t = setTimeout(() => {
                      setLiveLogs((s) => {
                        const arr = [...(s[reqId] || [])];
                        arr.shift();
                        const copy = { ...s };
                        if (arr.length === 0) delete copy[reqId]; else copy[reqId] = arr;
                        return copy;
                      });
                    }, 2500);
                    const timers = liveLogTimersRef.current.get(reqId) || [];
                    liveLogTimersRef.current.set(reqId, [...timers, t]);

                    // don't resolve on pure log messages (wait for final event)
                    if (msg.event !== 'agent_finish' && msg.event !== 'node_output') return;
                  }

                  const p = pendingRef.current.get(reqId)!;
                  clearTimeout(p.timeout);
                  const logs = pendingLogsRef.current.get(reqId) || [];
                  // Attach collected logs to the resolved payload under a private key
                  const resolved = { ...msg, _agent_logs: logs };
                  p.resolve(resolved);
                  pendingRef.current.delete(reqId);
                  pendingLogsRef.current.delete(reqId);
                  // clear live timers and live state for this request
                  const timers = liveLogTimersRef.current.get(reqId) || [];
                  timers.forEach((tt) => clearTimeout(tt));
                  liveLogTimersRef.current.delete(reqId);
                  setLiveLogs((s) => {
                    const copy = { ...s };
                    delete copy[reqId];
                    return copy;
                  });
                  return;
                }

            // If server doesn't echo request id but sends an event like 'agent_finish',
            // resolve the oldest pending request (best-effort mapping).
            if ((!reqId) && msg.event === 'agent_finish' && pendingRef.current.size > 0) {
              const firstKey = pendingRef.current.keys().next().value;
              const p = pendingRef.current.get(firstKey)!;
              clearTimeout(p.timeout);
              const logs = pendingLogsRef.current.get(firstKey) || [];
              const resolved = { ...(msg.final_output || msg), _agent_logs: logs };
              p.resolve(resolved);
              pendingRef.current.delete(firstKey);
              pendingLogsRef.current.delete(firstKey);
              return;
            }

                if (msg.event === 'log') {
                  if (msg.type === 'error') console.error('Agent log (error)', msg.message || msg);
                  else console.info('Agent log', msg.message || msg);
                  // best-effort: attach to oldest pending request's logs
                  if (pendingRef.current.size > 0) {
                    const firstKey = pendingRef.current.keys().next().value;
                    const prev = pendingLogsRef.current.get(firstKey) || [];
                    const line = String(msg.message || JSON.stringify(msg));
                    pendingLogsRef.current.set(firstKey, [...prev, line]);
                    // also update live UI for the oldest pending request
                    setLiveLogs((s) => {
                      const nextArr = [...(s[firstKey] || []), line];
                      return { ...s, [firstKey]: nextArr };
                    });
                    const t = setTimeout(() => {
                      setLiveLogs((s) => {
                        const arr = [...(s[firstKey] || [])];
                        arr.shift();
                        const copy = { ...s };
                        if (arr.length === 0) delete copy[firstKey]; else copy[firstKey] = arr;
                        return copy;
                      });
                    }, 7000);
                    const timers = liveLogTimersRef.current.get(firstKey) || [];
                    liveLogTimersRef.current.set(firstKey, [...timers, t]);
                  }
                  return;
                }

            if (msg.event === 'agent_start' || msg.event === 'agent_progress' || msg.event === 'node_start' || msg.event === 'node_end' || msg.event === 'agent') {
              console.info('Agent event', msg);
              return;
            }

            if (msg.event === 'error') {
              console.error('Agent error', msg);
              return;
            }

            console.info('WS message without matching request id (unrecognized event)', msg);
          } catch (err) {
            console.error('Failed to parse WS message', err);
          }
        });

        ws.addEventListener('error', (e) => console.error('WS error', e));

        ws.addEventListener('close', (e) => {
          console.log('WS closed', e);
          // Attempt reconnect if component is still mounted
          if (!mounted.current) return;
          // simple exponential backoff up to ~30s
          reconnectRef.current = Math.min(reconnectRef.current + 1, 6);
          const delay = Math.pow(2, reconnectRef.current) * 500; // 500ms,1s,2s,4s...
          console.info(`Attempting WS reconnect in ${delay}ms`);
          setTimeout(() => {
            if (!mounted.current) return;
            createWebSocket();
          }, delay);
        });
      } catch (err) {
        console.error('Could not open WS', err);
      }
    };

    // Start connection
    createWebSocket();

    return () => {
      mounted.current = false;
      try { wsRef.current?.close(); } catch (e) { /* ignore */ }
      // On unmount reject any pending requests
      pendingRef.current.forEach((p) => { clearTimeout(p.timeout); p.reject(new Error('socket closed')); });
      pendingRef.current.clear();
      // clear any live log timers
      liveLogTimersRef.current.forEach((timers) => timers.forEach((t: any) => clearTimeout(t)));
      liveLogTimersRef.current.clear();
      setLiveLogs({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Initialize per-request logs buffer so we can show internal agent events later
        pendingLogsRef.current.set(request_id, []);
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
function cleanVertexLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;

  return text.replace(urlRegex, (match) => {
    try {
      const parsed = new URL(match);

      // If it's a Vertex redirect, replace with domain placeholder
      if (parsed.hostname.includes("vertexaisearch.cloud.google.com")) {
        // Option 1: Extract the target domain from query text (if present)
        // Option 2: just show as [External Source]
        return `[External Source](${match})`;
      }

      // Otherwise, show clean clickable link with domain only
      const cleanDomain = parsed.hostname.replace("www.", "");
      return `[${cleanDomain}](${match})`;
    } catch {
      return match;
    }
  });
}

  const handleSendMessage = async (content: string, type?: "text" | "file" | "image" | "voice", fileName?: string, file?: File) => {
    const newMessage: Message = {
      id: genId(),
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
      let lastResp: any = null;
      if (type === "text") {
        console.log("Sending text message:", content);
        const resp = await fetchApiResponse(content);
        lastResp = resp;
        if (resp && resp.error) {
          botContent = resp.message;
        } else {
          botContent = resp?.agent_response || JSON.stringify(resp, null, 2);
          if (resp?.verified_results && Array.isArray(resp.verified_results) && resp.verified_results.length > 0) {
            const vrSummary = formatVerifiedResults(resp.verified_results);
            const vrMessage: Message = {
              id: genId(),
              content: "Verified results",
              sender: "bot",
              timestamp: new Date(),
              type: "verified",
              meta: { verified_results: resp.verified_results }
            };
            console.log("Adding verified results message (structured)");
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
            lastResp = resp;
            if (resp && resp.error) {
              botContent = resp.message;
            } else {
              botContent = resp?.agent_response || JSON.stringify(resp, null, 2);
              if (resp?.verified_results && Array.isArray(resp.verified_results) && resp.verified_results.length > 0) {
                const vrSummary = formatVerifiedResults(resp.verified_results);
                const vrMessage: Message = {
                  id: genId(),
                  content: "Verified results",
                  sender: "bot",
                  timestamp: new Date(),
                  type: "verified",
                  meta: { verified_results: resp.verified_results }
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
      const formattedContent = cleanVertexLinks(botContent);
      const botResponse: Message = {
        id: genId(),
        content: formattedContent,
        sender: "bot",
        timestamp: new Date(),
        meta: lastResp ? { ...(lastResp.meta || {}), agent_logs: lastResp._agent_logs || [] } : undefined
      };
      console.log("Bot response message:", botResponse);
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      // Add error message to chat
      const errorResponse: Message = {
        id: genId(),
        content: "I apologize, but something went wrong. Please try again.",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };
  useEffect(() => {
    console.log("Messages updated:", messages);
  }, [messages]);


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
            {/* Live AI thoughts for the first pending request (streaming) */}
            {(() => {
              const firstKey = Object.keys(liveLogs)[0];
              const lines = firstKey ? liveLogs[firstKey] || [] : [];
              if (!firstKey || lines.length === 0) return null;
              return (
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-1">AI thoughts</div>
                  <div className="space-y-1">
                    {lines.map((ln, i) => (
                      <div key={i} className="text-sm text-muted-foreground px-2 py-1 bg-muted rounded-md font-mono">{ln}</div>
                    ))}
                  </div>
                </div>
              );
            })()}
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









// import { useState, useEffect, useRef } from "react";
// import { ArrowLeft, LogOut, User as UserIcon } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import ChatMessage from "@/components/ChatMessage";
// import ChatInput from "@/components/ChatInput";
// import Sidebar from "@/components/Sidebar";
// import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { auth } from "@/lib/firebaseconfig";
// import { signOut, User, onAuthStateChanged } from "firebase/auth";
// import { useToast } from "@/hooks/use-toast";
// import { 
//   createChat, 
//   updateChatMessages, 
//   getChat
// } from "@/lib/chatService";

// interface Message {
//   id: string;
//   content: string;
//   sender: "user" | "bot";
//   timestamp: Date;
//   type?: "text" | "file" | "image" | "voice";
//   fileName?: string;
// }

// const Chat = () => {
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();
//   const chatId = searchParams.get("id");
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const { toast } = useToast();
//   const [user, setUser] = useState<User | null>(null);
//   const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: "welcome",
//       content: "Hello! I'm TrueLens AI. I can help you verify news, articles, images, or any content for misinformation. How can I assist you today?",
//       sender: "bot",
//       timestamp: new Date()
//     }
//   ]);
//   const [isTyping, setIsTyping] = useState(false);
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//       if (!currentUser) {
//         navigate("/auth");
//       }
//     });
//     return () => unsubscribe();
//   }, [navigate]);

//   // Load chat if chatId is provided
//   useEffect(() => {
//     const loadChat = async () => {
//       if (!user || !chatId) return;
      
//       setLoading(true);
//       try {
//         const chat = await getChat(chatId);
//         if (chat && chat.userId === user.uid) {
//           setMessages(chat.messages.length > 0 ? chat.messages : messages);
//           setCurrentChatId(chatId);
//         } else {
//           // Chat doesn't exist or doesn't belong to user, create new
//           setCurrentChatId(null);
//           setMessages([
//             {
//               id: "welcome",
//               content: "Hello! I'm TrueLens AI. I can help you verify news, articles, images, or any content for misinformation. How can I assist you today?",
//               sender: "bot",
//               timestamp: new Date()
//             }
//           ]);
//         }
//       } catch (error) {
//         console.error("Error loading chat:", error);
//         toast({
//           title: "Error",
//           description: "Failed to load chat. Starting a new chat.",
//           variant: "destructive",
//         });
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadChat();
//   }, [chatId, user]);

//   const urlchatid= searchParams.get("id");

//   // If there is no chatId in the URL, we reset currentChatId and show the welcome message
//   useEffect(() => {
//     if (urlchatid) return;
//     setCurrentChatId(null);
//     setMessages([
//       {
//         id: "welcome",
//         content: "Hello! I'm TrueLens AI. I can help you verify news, articles, images, or any content for misinformation. How can I assist you today?",
//         sender: "bot",
//         timestamp: new Date()
//       }
//     ]);
//   }, [urlchatid]);

//   // Save messages to Firestore whenever they change (debounced)
//   useEffect(() => {
//     if (!user || messages.length <= 1) return; // Don't save if only welcome message

//     const saveTimer = setTimeout(async () => {
//       try {
//         if (!currentChatId) {
//           // Create new chat
//           console.log("dataaaaaaa",user.uid, messages[1] || messages[0])
//           const newChatId = await createChat(user.uid, messages[1] || messages[0]);
//           setCurrentChatId(newChatId);
//           // Update URL without navigation
//           window.history.replaceState({}, "", `/chat?id=${newChatId}`);
//         } else {
//           // Update existing chat
//           await updateChatMessages(currentChatId, messages);
//         }
//       } catch (error) {
//         console.error("Error saving chat:", error);
//       }
//     }, 2000); // Save 2 seconds after last message

//     return () => clearTimeout(saveTimer);
//   }, [messages, currentChatId, user]);

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       toast({
//         title: "Signed out",
//         description: "You have been successfully signed out.",
//       });
//       navigate("/auth");
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to sign out. Please try again.",
//         variant: "destructive",
//       });
//     }
//   };

//   const getUserInitials = (user: User | null): string => {
//     if (!user) return "?";
//     if (user.displayName) {
//       return user.displayName
//         .split(" ")
//         .map((n) => n[0])
//         .join("")
//         .toUpperCase()
//         .slice(0, 2);
//     }
//     if (user.email) {
//       return user.email[0].toUpperCase();
//     }
//     return "?";
//   };

//   const getUserDisplayName = (user: User | null): string => {
//     if (!user) return "User";
//     return user.displayName || user.email?.split("@")[0] || "User";
//   };

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const fetchApiResponse = async (content: string): Promise<string> => {
//     try {
//       const response = await fetch("https://my-fastapi-app-575174467987.us-central1.run.app/verify", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({ 
//           text_claims: [content],
//           images_base64: [] 
//         })
//       });

//       if (!response.ok) {
//         if (response.status === 500) {
//           throw new Error("The verification service is currently experiencing issues. Please try again in a few moments.");
//         } else if (response.status === 429) {
//           throw new Error("Too many requests. Please wait a moment before trying again.");
//         } else {
//           throw new Error(`Server error (${response.status}). Please try again later.`);
//         }
//       }

//       const data = await response.json();
//       return JSON.stringify(data, null, 2); // Return formatted JSON string
//     } catch (error) {
//       console.error("API Error:", error);
//       const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
//       return `I apologize, but I'm having trouble processing your request. ${errorMessage} Please try again or rephrase your question.`;
//     }
//   };

//   const handleSendMessage = async (content: string, type?: "text" | "file" | "image" | "voice", fileName?: string) => {
//     const newMessage: Message = {
//       id: Date.now().toString(),
//       content,
//       sender: "user",
//       timestamp: new Date(),
//       type: type || "text",
//       fileName
//     };

//     setMessages(prev => [...prev, newMessage]);
//     setIsTyping(true);

//     try {
//       let botContent: string;
//       if (type === "text") {
//         botContent = await fetchApiResponse(content);
//       } else {
//         botContent = getBotResponse(content, type);
//       }
      
//       const botResponse: Message = {
//         id: (Date.now() + 1).toString(),
//         content: botContent,
//         sender: "bot",
//         timestamp: new Date()
//       };
//       setMessages(prev => [...prev, botResponse]);
//     } catch (error) {
//       // Add error message to chat
//       const errorResponse: Message = {
//         id: (Date.now() + 1).toString(),
//         content: "I apologize, but something went wrong. Please try again.",
//         sender: "bot",
//         timestamp: new Date()
//       };
//       setMessages(prev => [...prev, errorResponse]);
//     } finally {
//       setIsTyping(false);
//     }
//   };

//   const getBotResponse = (content: string, type?: string): string => {
//     if (type === "file" || type === "image") {
//       return "I've received your file. Let me analyze it for potential misinformation... \n\nAnalysis complete! The content appears to be legitimate with a confidence score of 87%. I found no significant red flags or misleading information. Would you like a detailed breakdown?";
//     }
//     if (type === "voice") {
//       return "I've processed your voice message. The transcribed content has been analyzed for factual accuracy. Initial assessment shows the claims are mostly accurate with minor clarifications needed. Would you like me to fact-check specific statements?";
//     }
    
//     // Default text response
//     return "I'm analyzing your message... \n\nBased on my analysis, I can provide insights about the credibility of this information. Would you like me to explain my findings in detail?";
//   };

//   return (
    
//   <div className="relative h-screen min-h-[100dvh]">
//       <Sidebar onSidebarOpen={setSidebarOpen} currentChatId={currentChatId} />
//       <header
//         className={`flex items-center justify-between gap-2 py-4 px-6 border-b border-border bg-card transition-all duration-300 ${sidebarOpen ? "ml-56" : "ml-0"} md:gap-4 md:px-8 md:py-4 sm:gap-2 sm:px-4 sm:py-3`}
//         style={{ zIndex: 10, position: "relative" }}
//       >
//         <div className="flex items-center gap-2">
//           <button 
//             onClick={() => navigate("/")} 
//             className="mr-2 text-muted-foreground hover:text-foreground transition-colors"
//             title="Go back"
//             aria-label="Go back"
//           >
//             <ArrowLeft className="h-5 w-5" />
//           </button>
//           <img src="/google-shield.svg" alt="Google Shield" className="w-10 h-10 min-w-8 min-h-8 sm:w-8 sm:h-8 md:w-10 md:h-10" />
//           <div className="ml-2 sm:ml-1 md:ml-2">
//             <div className="font-bold text-lg">TrueLens AI</div>
//             <div className="text-xs text-success">Online</div>
//           </div>
//         </div>

//         {/* Profile Button */}
//         {user && (
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button
//                 variant="ghost"
//                 className="relative h-10 w-10 rounded-full hover:bg-accent transition-colors"
//               >
//                 <Avatar className="h-10 w-10 border-2 border-border">
//                   <AvatarImage 
//                     src={user.photoURL || undefined} 
//                     alt={getUserDisplayName(user)} 
//                   />
//                   <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
//                     {getUserInitials(user)}
//                   </AvatarFallback>
//                 </Avatar>
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent className="w-56" align="end" forceMount>
//               <DropdownMenuLabel className="font-normal">
//                 <div className="flex flex-col space-y-1">
//                   <p className="text-sm font-medium leading-none">
//                     {getUserDisplayName(user)}
//                   </p>
//                   <p className="text-xs leading-none text-muted-foreground">
//                     {user.email}
//                   </p>
//                 </div>
//               </DropdownMenuLabel>
//               <DropdownMenuSeparator />
//               {/* <DropdownMenuItem
//                 onClick={() => {
                
//                 }}
//                 className="cursor-pointer"
//               >
//                 <UserIcon className="mr-2 h-4 w-4" />
//                 <span>Profile</span>
//               </DropdownMenuItem> */}
//               <DropdownMenuSeparator />
//               <DropdownMenuItem
//                 onClick={handleLogout}
//                 className="cursor-pointer text-destructive focus:text-destructive"
//               >
//                 <LogOut className="mr-2 h-4 w-4" />
//                 <span>Log out</span>
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         )}
//       </header>
//   <main className="flex-1 flex flex-col min-w-0">
//         {/* Messages */}
//         <div className="flex-1 overflow-y-auto pb-32">
//           <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-2 sm:py-4 md:px-6 md:py-8">
//             {messages.map((message) => (
//               <ChatMessage key={message.id} message={message} />
//             ))}
//             {isTyping && (
//               <div className="flex items-center gap-2 text-muted-foreground mb-4">
//                 <div className="flex gap-1">
//                   <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
//                   <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
//                   <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
//                 </div>
//                 <span className="text-sm">TrueLens is analyzing...</span>
//               </div>
//             )}
//             <div ref={messagesEndRef} />
//           </div>
//         </div>

//         {/* Input */}
//         <ChatInput onSendMessage={handleSendMessage} />
//       </main>
//     </div>
  
//   );
// };

// export default Chat;
