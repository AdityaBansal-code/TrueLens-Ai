import React from "react";

interface ChatHistoryItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface ChatSidebarProps {
  chats: ChatHistoryItem[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ chats, onSelect, selectedId }) => {
  return (
    <aside className="w-72 bg-card border-r border-border h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-2">
  <img src="/google-shield.svg" alt="Google Shield" className="w-8 h-8" />
        <span className="font-bold text-lg">Old Chats</span>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <li className="p-4 text-muted-foreground text-sm">No previous chats</li>
        ) : (
          chats.map(chat => (
            <li key={chat.id}>
              <button
                type="button"
                className={`w-full flex items-center gap-3 p-3 cursor-pointer hover:bg-muted transition-all text-left ${selectedId === chat.id ? "bg-muted" : ""}`}
                onClick={() => onSelect(chat.id)}
                tabIndex={0}
                aria-label={`Select chat: ${chat.title}`}
              >
                <img src="/google-shield.svg" alt="Google Shield" className="w-6 h-6" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{chat.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{chat.lastMessage}</div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{chat.timestamp}</div>
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
};

export default ChatSidebar;
