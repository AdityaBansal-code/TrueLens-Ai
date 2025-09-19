import { useState, useRef } from "react";
import { Send, Paperclip, Image, Mic, MicOff, StopCircle, Type, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string, type?: "text" | "file" | "image" | "voice", fileName?: string) => void;
}

const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  
  // Touch tracking for swipe detection
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message, "text");
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Touch event handlers for swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    
    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Right swipe - enable multi-line mode
        setIsMultiLine(true);
      } else {
        // Left swipe - enable single-line mode
        setIsMultiLine(false);
      }
    }
    
    // Reset touch tracking
    touchStartX.current = 0;
    touchStartY.current = 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
    const file = e.target.files?.[0];
    if (file) {
      onSendMessage(`Uploaded ${type}: ${file.name}`, type, file.name);
      // Reset input
      e.target.value = "";
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      onSendMessage("Voice message recorded", "voice");
    } else {
      // Start recording
      setIsRecording(true);
      // In a real app, you would start actual recording here
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="container mx-auto max-w-4xl px-4 py-4">
        {/* Mode indicator */}
        <div className="flex items-center justify-center mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
            {isMultiLine ? (
              <>
                <MessageSquareText className="h-3 w-3" />
                <span>Multi-line mode • Swipe left for single line</span>
              </>
            ) : (
              <>
                <Type className="h-3 w-3" />
                <span>Single-line mode • Swipe right for multi-line</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            {isMultiLine ? (
              <Textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                placeholder="Type your message... (Swipe left for single line)"
                className="resize-none min-h-[48px] max-h-32 pr-12 py-3 text-base bg-muted/50 border-border focus:border-primary transition-colors"
                rows={3}
              />
            ) : (
              <Input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                placeholder="Type your message... (Swipe right for multi-line)"
                className="pr-12 py-6 text-base bg-muted/50 border-border focus:border-primary transition-colors"
              />
            )}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Upload file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => imageInputRef.current?.click()}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Upload image"
              >
                <Image className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={toggleRecording}
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              isRecording && "animate-pulse"
            )}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <StopCircle className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim()}
            className="h-12 w-12 rounded-full bg-gradient-primary hover:opacity-90 text-primary-foreground border-0 shadow-md hover:shadow-lg transition-all"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) => handleFileUpload(e, "file")}
          className="hidden"
          aria-label="Upload file"
          title="Upload file"
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e, "image")}
          className="hidden"
          aria-label="Upload image"
          title="Upload image"
        />
      </div>
    </div>
  );
};

export default ChatInput;