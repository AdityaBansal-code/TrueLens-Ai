import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: "user" | "bot";
    timestamp: Date;
    type?: "text" | "file" | "image" | "voice" | "verified";
    fileName?: string;
    meta?: any;
  };
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.sender === "user";
  const [showLogs, setShowLogs] = useState(false);

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
          {message.type === 'verified' && message.meta?.verified_results ? (
            <div className="prose text-sm leading-relaxed">
              <strong>Verified results</strong>
              {Array.isArray(message.meta.verified_results) ? (
                message.meta.verified_results.map((vr: any, idx: number) => (
                  <div key={idx} className="mt-2 p-2 bg-muted rounded">
                    {vr.newly_verified_text_claims && vr.newly_verified_text_claims.map((c: any, ci: number) => (
                      <div key={ci} className="mb-2">
                        <div className="font-semibold">{c.claim}</div>
                        <div className="text-xs text-muted-foreground">{c.classification} — confidence: {c.confidence ?? 'n/a'}</div>
                        {c.justification && <div className="mt-1 text-sm whitespace-pre-wrap">{c.justification}</div>}
                        { (c.evidence || c.evidence?.official_fact_checks || vr?.evidence?.official_fact_checks) && (
                          <div className="mt-1">
                            <div className="text-xs font-medium">Sources:</div>
                            <ul className="list-disc ml-4 text-xs">
                              {(() => {
                                const evidenceRaw = c.evidence || c.evidence?.official_fact_checks || vr?.evidence?.official_fact_checks;
                                const evidenceList = Array.isArray(evidenceRaw) ? evidenceRaw : (evidenceRaw ? [evidenceRaw] : []);
                                return evidenceList.map((s: any, si: number) => (
                                  <li key={si}><a className="text-primary underline" href={s?.url || s} target="_blank" rel="noreferrer">{s?.publisher ? `${s.publisher}` : (s?.url || String(s))}</a></li>
                                ));
                              })()}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}

                    {vr.grounded_ai_summary && (
                      <div className="mt-1 text-sm">{vr.grounded_ai_summary}</div>
                    )}

                    {vr.grounded_citations && (Array.isArray(vr.grounded_citations) ? vr.grounded_citations.length > 0 : true) && (
                      <div className="mt-2">
                        <div className="text-xs font-medium">Citations:</div>
                        <ul className="list-disc ml-4 text-xs">
                          {(() => {
                            const citRaw = vr.grounded_citations || vr.citations || [];
                            const citList = Array.isArray(citRaw) ? citRaw : (citRaw ? [citRaw] : []);
                            return citList.map((c: any, ci: number) => (
                              <li key={ci}><a className="text-primary underline" href={c?.url || c} target="_blank" rel="noreferrer">{c?.title || c?.publisher || c?.url || String(c)}</a></li>
                            ));
                          })()}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(message.meta.verified_results, null, 2)}</pre>
              )}
            </div>
          ) : (
          
<div className="text-sm leading-relaxed whitespace-pre-wrap">
  <ReactMarkdown
    components={{
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {children}
        </a>
      ),
      p: ({ children }) => <p className="mb-1">{children}</p>,
      li: ({ children }) => <li className="ml-2">{children}</li>,
    }}
  >
    {message.content}
  </ReactMarkdown>
</div>
          )}
        </div>
        {/* Agent "thinking" logs (optional) */}
        {message.meta?.agent_logs && Array.isArray(message.meta.agent_logs) && message.meta.agent_logs.length > 0 && (
          <div className="mt-2">
            <button onClick={() => setShowLogs((s) => !s)} className="text-xs text-muted-foreground underline">
              {showLogs ? 'Hide AI thoughts' : 'Show AI thoughts'}
            </button>
            {showLogs && (
              <div className="mt-2 p-2 bg-black/5 rounded text-xs font-mono whitespace-pre-wrap max-h-52 overflow-auto">
                {message.meta.agent_logs.map((line: string, i: number) => (
                  <div key={i} className="mb-1">{line}</div>
                ))}
              </div>
            )}
          </div>
        )}
        <span className={cn(
          "text-xs text-muted-foreground mt-1 block opacity-0 group-hover:opacity-100 transition-opacity",
          isUser ? "text-right mr-1" : "text-left ml-1"
        )}>
       format(message.timestamp.toDate(), "hh:mm a")

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
//           {format(message.timestamp, "hh:mm a")}
//         </span>
//       </div>
//     </div>
//   );
// };

// export default ChatMessage;



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
