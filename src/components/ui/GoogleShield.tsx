import React from "react";

const GoogleShield: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className || "w-20 h-20"}
    >
      {/* Top-left (Blue) */}
      <path
        d="M12 3L4 7v6"
        fill="none"
        stroke="#4285F4"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top-right (Red) */}
      <path
        d="M12 3l8 4v6"
        fill="none"
        stroke="#EA4335"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom-right (Green) */}
      <path
        d="M20 13c0 5-3.5 9-8 10"
        fill="none"
        stroke="#34A853"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom-left (Yellow) */}
      <path
        d="M4 13c0 5 3.5 9 8 10"
        fill="none"
        stroke="#FBBC05"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default GoogleShield;
