import React, { useState } from "react";
import { FaSearch } from "react-icons/fa";

const BarsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="4" width="20" height="1.8" rx="0.9" fill="#757575" />
    <rect y="9" width="20" height="1.8" rx="0.9" fill="#757575" />
    <rect y="14" width="20" height="1.8" rx="0.9" fill="#757575" />
  </svg>
);

const Sidebar: React.FC<{ onSidebarOpen?: (open: boolean) => void }> = ({ onSidebarOpen }) => {
  const [visible, setVisible] = useState(false);
  const [locked, setLocked] = useState(false);

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
    setVisible(v => !v || !locked); // Open if locking, close if unlocking
    onSidebarOpen?.(!locked);
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
        className={`fixed top-0 left-0 h-full w-56 bg-card border-r border-border shadow-lg z-40 transition-transform duration-300 ${visible ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!visible}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <button className="p-1 rounded-full hover:bg-muted transition" aria-label="Toggle sidebar" onClick={handleToggle}>
            <BarsIcon />
          </button>
          <button className="p-2 rounded-full hover:bg-muted transition" aria-label="Search old chats">
            <FaSearch size={16} />
          </button>
        </div>
        <div className="p-4 text-muted-foreground text-sm">
          {/* Placeholder for old chats */}
          No previous chats yet.
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
