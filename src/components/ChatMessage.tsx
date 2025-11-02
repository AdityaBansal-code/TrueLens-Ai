import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: "user" | "bot";
    timestamp: Date;
    type?: "text" | "file" | "image" | "voice";
    fileName?: string;
  };
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.sender === "user";

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] relative group",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-3 shadow-sm",
          isUser 
            ? "bg-gradient-primary text-primary-foreground rounded-br-sm" 
            : "bg-muted text-foreground rounded-bl-sm"
        )}>
          {message.type === "file" && (
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <span className="text-xs">📎 {message.fileName}</span>
            </div>
          )}
          {message.type === "image" && (
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <span className="text-xs">🖼️ Image</span>
            </div>
          )}
          {message.type === "voice" && (
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <span className="text-xs">🎤 Voice message</span>
            </div>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className={cn(
          "text-xs text-muted-foreground mt-1 block opacity-0 group-hover:opacity-100 transition-opacity",
          isUser ? "text-right mr-1" : "text-left ml-1"
        )}>
          {format(message.timestamp, "hh:mm a")}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;



// import { cn } from "@/lib/utils";
// import { format } from "date-fns";

// interface ChatMessageProps {
//   message: {
//     id: string;
//     content: string;
//     sender: "user" | "bot";
//     timestamp: Date;
//     type?: "text" | "file" | "image" | "voice";
//     fileName?: string;
//   };
// }

// const ChatMessage = ({ message }: ChatMessageProps) => {
//   const isUser = message.sender === "user";

//   return (
//     <div className={cn(
//       "flex w-full mb-4",
//       isUser ? "justify-end" : "justify-start"
//     )}>
//       <div className={cn(
//         "max-w-[70%] relative group",
//         isUser ? "items-end" : "items-start"
//       )}>
//         <div className={cn(
//           "rounded-2xl px-4 py-3 shadow-sm",
//           isUser 
//             ? "bg-gradient-primary text-primary-foreground rounded-br-sm" 
//             : "bg-muted text-foreground rounded-bl-sm"
//         )}>
//           {message.type === "file" && (
//             <div className="flex items-center gap-2 mb-2 opacity-90">
//               <span className="text-xs">📎 {message.fileName}</span>
//             </div>
//           )}
//           {message.type === "image" && (
//             <div className="flex items-center gap-2 mb-2 opacity-90">
//               <span className="text-xs">🖼️ Image</span>
//             </div>
//           )}
//           {message.type === "voice" && (
//             <div className="flex items-center gap-2 mb-2 opacity-90">
//               <span className="text-xs">🎤 Voice message</span>
//             </div>
//           )}
//           <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
//         </div>
//         <span className={cn(
//           "text-xs text-muted-foreground mt-1 block opacity-0 group-hover:opacity-100 transition-opacity",
//           isUser ? "text-right mr-1" : "text-left ml-1"
//         )}>
//           {format(message.timestamp, "HH:mm")}
//         </span>
//       </div>
//     </div>
//   );
// };

// export default ChatMessage;
