import React, { useState, useEffect, useRef } from "react";
import { FaSearch } from "react-icons/fa";
import { MessageSquare, Plus, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebaseconfig";
import { User } from "firebase/auth";
import { subscribeToUserChats, deleteChat, Chat } from "@/lib/chatService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const BarsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="4" width="20" height="1.8" rx="0.9" fill="#757575" />
    <rect y="9" width="20" height="1.8" rx="0.9" fill="#757575" />
    <rect y="14" width="20" height="1.8" rx="0.9" fill="#757575" />
  </svg>
);

interface SidebarProps {
  onSidebarOpen?: (open: boolean) => void;
  currentChatId?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ onSidebarOpen, currentChatId }) => {
  const [visible, setVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const asideRef = useRef<HTMLElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserChats(user.uid, (updatedChats) => {
      setChats(updatedChats);
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);


  useEffect(() => {
    const asideEl = asideRef.current;
    if (!asideEl) return;

    const setInert = (value: boolean) => {
      // Prefer native inert
      try {
        if ((HTMLElement.prototype as any).hasOwnProperty("inert")) {
          (asideEl as any).inert = value;
        } else {
          if (value) asideEl.setAttribute("inert", "");
          else asideEl.removeAttribute("inert");
        }
      } catch (e) {
        // Fallback: set/remove attribute
        if (value) asideEl.setAttribute("inert", "");
        else asideEl.removeAttribute("inert");
      }

      if (value) {
        asideEl.setAttribute("aria-hidden", "true");
      } else {
        asideEl.removeAttribute("aria-hidden");
      }
    };

    setInert(!visible);

    if (!visible) {
      const active = document.activeElement;
      if (active && asideEl.contains(active)) {
        // Move focus to the toggle button if possible, otherwise blur
        if (toggleButtonRef.current) {
          toggleButtonRef.current.focus();
        } else {
          (active as HTMLElement).blur();
        }
      }
    }

    return () => {
      // cleanup: ensure inert/aria-hidden removed if component unmounts
      setInert(false);
    };
  }, [visible]);

  // Show sidebar on hover near left edge or toggle button
  const handleMouseEnter = () => {
    if (!locked) {
      setVisible(true);
      onSidebarOpen?.(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (!locked) {
      setVisible(false);
      onSidebarOpen?.(false);
    }
  };
  
  const handleToggle = () => {
    setLocked(l => !l);
    setVisible(v => !v || !locked); 
    onSidebarOpen?.(!locked);
  };

  const handleNewChat = () => {
    navigate("/chat");
    if (!locked) {
      setVisible(false);
      onSidebarOpen?.(false);
    }
  };

  const handleChatClick = (chatId: string) => {
    navigate(`/chat?id=${chatId}`);
    if (!locked) {
      setVisible(false);
      onSidebarOpen?.(false);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      await deleteChat(chatId);
      toast({
        title: "Chat deleted",
        description: "The chat has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatChatTime = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  return (
    <>
      {/* Hover area for sidebar */}
      <div
        className="fixed top-0 left-0 h-full w-5 z-50 cursor-pointer"
        onMouseEnter={handleMouseEnter}
        aria-label="Open sidebar"
      />

      {/* Sidebar Panel */}
      <aside
        ref={asideRef}
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border shadow-lg z-40 transition-transform duration-300 ${visible ? "translate-x-0" : "-translate-x-full"} flex flex-col`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div className="p-[22px_16px] border-b border-border flex items-center justify-between">
          <button 
            ref={toggleButtonRef}
            className="p-1 rounded-full hover:bg-muted transition" 
            aria-label="Toggle sidebar" 
            onClick={handleToggle}
          >
            <BarsIcon />
          </button>
          <button 
            className="p-2 rounded-full hover:bg-muted transition" 
            aria-label="Search old chats"
            title="Search (coming soon)"
          >
            <FaSearch size={16} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-2 border-b border-border">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No previous chats yet.</p>
                <p className="text-xs mt-1">Start a new conversation!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => handleChatClick(chat.id)}
                    className={`
                      group relative flex items-start gap-2 p-2 rounded-lg cursor-pointer
                      transition-colors hover:bg-muted/50
                      ${currentChatId === chat.id ? "bg-muted" : ""}
                    `}
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {chat.title.slice(0, 20) || "Untitled Chat"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatChatTime(chat.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                      aria-label="Delete chat"
                      title="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
};

export default Sidebar;







// import React, { useState } from "react";
// import { FaSearch } from "react-icons/fa";

// const BarsIcon = () => (
//   <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
//     <rect y="4" width="20" height="1.8" rx="0.9" fill="#757575" />
//     <rect y="9" width="20" height="1.8" rx="0.9" fill="#757575" />
//     <rect y="14" width="20" height="1.8" rx="0.9" fill="#757575" />
//   </svg>
// );

// const Sidebar: React.FC<{ onSidebarOpen?: (open: boolean) => void }> = ({ onSidebarOpen }) => {
//   const [visible, setVisible] = useState(false);
//   const [locked, setLocked] = useState(false);

//   // Show sidebar on hover near left edge or toggle button
//   const handleMouseEnter = () => {
//     if (!locked) {
//       setVisible(true);
//       onSidebarOpen?.(true);
//     }
//   };
//   const handleMouseLeave = () => {
//     if (!locked) {
//       setVisible(false);
//       onSidebarOpen?.(false);
//     }
//   };
//   const handleToggle = () => {
//     setLocked(l => !l);
//     setVisible(v => !v || !locked); // Open if locking, close if unlocking
//     onSidebarOpen?.(!locked);
//   };

//   return (
//     <>
//       {/* Hover area for sidebar */}
//       <div
//         className="fixed top-0 left-0 h-full w-5 z-50 cursor-pointer"
//         onMouseEnter={handleMouseEnter}
//         aria-label="Open sidebar"
//       />

//       {/* Sidebar Panel */}
//       <aside
//         className={`fixed top-0 left-0 h-full w-56 bg-card border-r border-border shadow-lg z-40 transition-transform duration-300 ${visible ? "translate-x-0" : "-translate-x-full"}`}
//         aria-hidden={!visible}
//         onMouseEnter={handleMouseEnter}
//         onMouseLeave={handleMouseLeave}
//       >
//         <div style={{ padding: "22px 16px" }} className=" border-b border-border flex items-center justify-between">
//           <button className="p-1 rounded-full hover:bg-muted transition" aria-label="Toggle sidebar" onClick={handleToggle}>
//             <BarsIcon />
//           </button>
//           <button className="p-2 rounded-full hover:bg-muted transition" aria-label="Search old chats">
//             <FaSearch size={16} />
//           </button>
//         </div>
//         <div className="p-4 text-muted-foreground text-sm">
//           {/* Placeholder for old chats */}
//           No previous chats yet.
//         </div>
//       </aside>
//     </>
//   );
// };

// export default Sidebar;
