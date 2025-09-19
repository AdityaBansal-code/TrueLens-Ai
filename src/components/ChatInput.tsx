import { useState, useRef } from "react";
import { Send, Paperclip, Image, Mic, MicOff, StopCircle, Type, MessageSquareText, Plus, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageBox {
  id: string;
  content: string;
  image?: File;
  imagePreview?: string;
}

interface ChatInputProps {
  onSendMessage: (message: string, type?: "text" | "file" | "image" | "voice", fileName?: string) => void;
}

const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [messageBoxes, setMessageBoxes] = useState<MessageBox[]>([
    { id: '1', content: '' }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  
  // Touch tracking for swipe detection
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleSend = () => {
    if (isMultiLine) {
      // Send all message boxes with content
      const validBoxes = messageBoxes.filter(box => box.content.trim());
      if (validBoxes.length > 0) {
        validBoxes.forEach((box, index) => {
          setTimeout(() => {
            if (box.image) {
              onSendMessage(`${box.content}\n[Image: ${box.image.name}]`, "image", box.image.name);
            } else {
              onSendMessage(box.content, "text");
            }
          }, index * 100); // Small delay between messages
        });
        
        // Reset all boxes
        setMessageBoxes([{ id: '1', content: '' }]);
      }
    } else {
      // Single line mode
      if (message.trim()) {
        onSendMessage(message, "text");
        setMessage("");
      }
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

  const toggleInputMode = () => {
    setIsMultiLine(!isMultiLine);
  };

  // Multi-box management functions
  const addMessageBox = () => {
    const newBox: MessageBox = {
      id: Date.now().toString(),
      content: ''
    };
    setMessageBoxes(prev => [...prev, newBox]);
  };

  const removeMessageBox = (id: string) => {
    if (messageBoxes.length > 1) {
      setMessageBoxes(prev => prev.filter(box => box.id !== id));
    }
  };

  const updateMessageBox = (id: string, content: string) => {
    setMessageBoxes(prev => 
      prev.map(box => 
        box.id === id ? { ...box, content } : box
      )
    );
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setMessageBoxes(prev => 
        prev.map(box => 
          box.id === id ? { 
            ...box, 
            image: file, 
            imagePreview: e.target?.result as string 
          } : box
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (id: string) => {
    setMessageBoxes(prev => 
      prev.map(box => 
        box.id === id ? { 
          ...box, 
          image: undefined, 
          imagePreview: undefined 
        } : box
      )
    );
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
                <span>Multi-line mode • Click button or swipe left for single line</span>
              </>
            ) : (
              <>
                <Type className="h-3 w-3" />
                <span>Single-line mode • Click button or swipe right for multi-line</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-end gap-2">
          {/* Mode Toggle Button */}
          <Button
            size="icon"
            variant="outline"
            onClick={toggleInputMode}
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              isMultiLine 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "hover:bg-muted"
            )}
            title={isMultiLine ? "Switch to single line" : "Switch to multi-line"}
          >
            {isMultiLine ? (
              <Type className="h-5 w-5" />
            ) : (
              <MessageSquareText className="h-5 w-5" />
            )}
          </Button>

          <div className="flex-1 relative">
            {isMultiLine ? (
              <div className="space-y-3">
                {messageBoxes.map((box, index) => (
                  <div key={box.id} className="relative border border-border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Message {index + 1}
                          </span>
                          {messageBoxes.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMessageBox(box.id)}
                              className="h-5 w-5 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        <Textarea
                          value={box.content}
                          onChange={(e) => updateMessageBox(box.id, e.target.value)}
                          onKeyDown={handleKeyPress}
                          onTouchStart={handleTouchStart}
                          onTouchEnd={handleTouchEnd}
                          placeholder={`Type message ${index + 1}...`}
                          className="resize-none min-h-[60px] max-h-24 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
                          rows={2}
                        />
                        
                        {box.imagePreview && (
                          <div className="mt-2 relative inline-block">
                            <img 
                              src={box.imagePreview} 
                              alt="Preview" 
                              className="w-20 h-20 object-cover rounded border"
                            />
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => removeImage(box.id)}
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              handleImageUpload(box.id, file);
                            }
                          };
                          input.click();
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Add image"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addMessageBox}
                  className="w-full h-10 border-dashed border-2 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add another message
                </Button>
              </div>
            ) : (
              <Input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                placeholder="Type your message... (Click button or swipe right for multi-line)"
                className="pr-12 py-6 text-base bg-muted/50 border-border focus:border-primary transition-colors"
              />
            )}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {!isMultiLine && (
                <>
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
                </>
              )}
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
            disabled={isMultiLine ? !messageBoxes.some(box => box.content.trim()) : !message.trim()}
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