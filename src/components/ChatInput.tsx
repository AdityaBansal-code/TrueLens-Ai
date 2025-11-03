import { useState, useRef } from "react";
import { Send, Paperclip, Image, Mic, MicOff, StopCircle, Type, MessageSquareText, Plus, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { VoiceRecorder } from "@/utils/voiceRecorder";
import { transcribeBase64Audio } from "@/lib/audio";

interface MessageBox {
  id: string;
  content: string;
  image?: File;
  imagePreview?: string;
}

interface ChatInputProps {
  // message, type, fileName, optional File object (for uploads)
  onSendMessage: (message: string, type?: "text" | "file" | "image" | "voice", fileName?: string, file?: File) => void;
}

const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [messageBoxes, setMessageBoxes] = useState<MessageBox[]>([
    { id: `${Date.now()}-${Math.random().toString(36).slice(2,9)}`, content: '' }
  ]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const voiceRecorder = useRef<VoiceRecorder>(new VoiceRecorder());
  
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
              onSendMessage(`${box.content}\n[Image: ${box.image.name}]`, "image", box.image.name, box.image);
            } else {
              onSendMessage(box.content, "text","text");
            }
          }, index * 100); // Small delay between messages
        });
        
        // Send shared files
        uploadedFiles.forEach((file, index) => {
          setTimeout(() => {
            onSendMessage(`Uploaded file: ${file.name}`, "file", file.name, file);
          }, (validBoxes.length + index) * 100);
        });
        
        // Send shared images
        uploadedImages.forEach((file, index) => {
          setTimeout(() => {
            onSendMessage(`Uploaded image: ${file.name}`, "image", file.name, file);
          }, (validBoxes.length + uploadedFiles.length + index) * 100);
        });
        
        // Reset all boxes and uploads
        setMessageBoxes([{ id: '1', content: '' }]);
        setUploadedFiles([]);
        setUploadedImages([]);
      }
    } else {
      // Single line mode

      // allow sending text, image or both together
      const hasText = Boolean(message.trim());
      const hasImage = Boolean(selectedImage);

      if (!hasText && !hasImage) return; // nothing to send

      if (hasImage) {
        // send text + image together as a single message (image type)
        const textPart = hasText ? message.trim() : "";
        // const payload = textPart ? `${textPart}\n[Image: ${selectedImage!.name}]` : `[Image: ${selectedImage!.name}]`;
        onSendMessage(textPart, "image", selectedImage!.name, selectedImage!);
      } else {
        // only text
        onSendMessage(message, "text", "text");
      }

      // clear input and selected image
      setMessage("");
      if (selectedImagePreview) {
        try { URL.revokeObjectURL(selectedImagePreview); } catch (e) { /* ignore */ }
      }
      setSelectedImage(null);
      setSelectedImagePreview(null);
      setUploadedImages([]);
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
    console.log("Uploaded file:", file);
    if (file) {
      if (isMultiLine) {
        // For multi-line mode, add to shared uploads
        if (type === "file") {
          setUploadedFiles(prev => [...prev, file]);
        } else {
          setUploadedImages(prev => [...prev, file]);
        }
      } else {
        // For single-line mode, send immediately
        if (type === "image") {
          // show preview in the input box
          const url = URL.createObjectURL(file);
          setSelectedImage(file);
          setSelectedImagePreview(url);
          setUploadedImages([file]);
        } else {
          // file (non-image) -- store in uploadedFiles and show name
          setUploadedFiles(prev => [...prev, file]);
        }
      }
      // Reset input
      e.target.value = "";
    }
  };

  const removeUploadedFile = (index: number, type: "file" | "image") => {
    if (type === "file") {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setUploadedImages(prev => prev.filter((_, i) => i !== index));
    }
  };

 

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        setIsRecording(false);
        setIsTranscribing(true);
        const base64Audio = await voiceRecorder.current.stopRecording();
         console.log("Transcription result:", base64Audio);
        const transcript = await transcribeBase64Audio(base64Audio);
        setIsTranscribing(false);
        console.log("Transcription result:", transcript);
        if (isMultiLine) {
          // In multi-line mode, add transcript to current message box
          const currentBox = messageBoxes[messageBoxes.length - 1];
          updateMessageBox(currentBox.id, transcript);
        } else {
          // In single-line mode, set transcript as message
          setMessage(transcript);
        }
      } else {
        await voiceRecorder.current.startRecording();
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecording(false);
      setIsTranscribing(false);
      // Handle error (show notification to user)
    }
  };

  const toggleInputMode = () => {
    setIsMultiLine(!isMultiLine);
    // Reset uploads when switching modes
    setUploadedFiles([]);
    setUploadedImages([]);
    // Reset message boxes to initial state
    setMessageBoxes([{ id: '1', content: '' }]);
  };

  const addMessageBox = () => {
    const newBox: MessageBox = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
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

  const removeSelectedImage = () => {
    if (selectedImagePreview) {
      try { URL.revokeObjectURL(selectedImagePreview); } catch (e) { /* ignore */ }
    }
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setUploadedImages([]);
  }

  // Replace or update the recording button JSX
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="container mx-auto max-w-4xl px-2 sm:px-4 py-4">
        {/* Mode indicator */}
        <div className="flex items-center justify-center mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 sm:px-3 py-1 rounded-full max-w-full">
            {isMultiLine ? (
              <>
                <MessageSquareText className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline">Multi-line mode • Click button or swipe left for single line</span>
                <span className="sm:hidden">Multi-line mode</span>
              </>
            ) : (
              <>
                <Type className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline">Single-line mode • Click button or swipe right for multi-line</span>
                <span className="sm:hidden">Single-line mode</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-end gap-1 sm:gap-2">
          {/* Mode Toggle Button */}
          {/* <Button
            size="icon"
            variant="outline"
            onClick={toggleInputMode}
            className={cn(
              "h-10 w-10 sm:h-12 sm:w-12 rounded-full transition-all flex-shrink-0",
              isMultiLine 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "hover:bg-muted"
            )}
            title={isMultiLine ? "Switch to single line" : "Switch to multi-line"}
          >
            {isMultiLine ? (
              <Type className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              // <MessageSquareText className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button> */}

          <div className="flex-1 relative">
            {isMultiLine ? (
              <div className="space-y-3">
                {/* Shared Upload Controls for Multi-line Mode */}
                <div className="flex items-center gap-1 sm:gap-2 pb-2 border-b border-border/50 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground flex-shrink-0"></span>
                 
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 px-2 sm:h-8 sm:px-3 text-muted-foreground hover:text-foreground text-xs"
                    title="Upload file"
                  >
                    <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden xs:inline">File</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => imageInputRef.current?.click()}
                    className="h-7 px-2 sm:h-8 sm:px-3 text-muted-foreground hover:text-foreground text-xs"
                    title="Upload image"
                  >
                    <Image className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden xs:inline">Image</span>
                  </Button>
                </div>

                {/* Display uploaded files and images */}
                {(uploadedFiles.length > 0 || uploadedImages.length > 0) && (
                  <div className="flex flex-wrap gap-1 sm:gap-2 p-2 bg-muted/50 rounded border max-w-full overflow-hidden">
                    {uploadedFiles.map((file, index) => (
                      <div key={`file-${index}`} className="flex items-center gap-1 bg-background px-2 py-1 rounded text-xs max-w-full">
                        <Paperclip className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeUploadedFile(index, "file")}
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {uploadedImages.map((file, index) => (
                      <div key={`image-${index}`} className="flex items-center gap-1 bg-background px-2 py-1 rounded text-xs max-w-full">
                        <Image className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeUploadedFile(index, "image")}
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {messageBoxes.map((box, index) => (
                  <div key={box.id} className="relative border border-border rounded-lg  p-3 sm:p-3 bg-muted/30">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {/* <span className="text-xs font-medium text-muted-foreground">
                            Message {index + 1}
                          </span> */}
                          {messageBoxes.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMessageBox(box.id)}
                              className="h-5 w-5 absolute right-1 top-1 text-muted-foreground hover:text-destructive"
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
                          className="resize-none min-h-[60px] max-h-20 sm:max-h-24 text-sm border-0 bg-transparent p-2 focus-visible:ring-0 w-full"
                          rows={2}
                        />
                        
                        {box.imagePreview && (
                          <div className="mt-2 relative inline-block">
                            <img 
                              src={box.imagePreview} 
                              alt="Preview" 
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border"
                            />
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => removeImage(box.id)}
                              className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full"
                            >
                              <X className="h-2 w-2 sm:h-3 sm:w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addMessageBox}
                  className="w-full h-10 border-dashed border-2 text-muted-foreground hover:text-foreground text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <span className="hidden xs:inline">Add another message</span>
                  <span className="xs:hidden">Add message</span>
                </Button>
              </div>
            ) : (
              <div className="relative">
                {selectedImagePreview && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <img src={selectedImagePreview} alt="preview" className="w-10 h-10 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      title="Remove image"
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <Input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  placeholder="Type your message... (Click button or swipe right for multi-line)"
                  className={cn(
                    "pr-20 sm:pr-12 py-6 text-sm sm:text-base bg-muted/50 border-border focus:border-primary transition-colors",
                    selectedImagePreview ? "pl-24" : ""
                  )}
                />
              </div>
            )}
            
            <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {!isMultiLine && (
                <>
                  {/* <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                    title="Upload file"
                  >
                    <Paperclip className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button> */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => imageInputRef.current?.click()}
                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                    title="Upload image"
                  >
                    <Image className="h-3 w-3 sm:h-4 sm:w-4" />
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
              "h-10 w-10 sm:h-12 sm:w-12 rounded-full transition-all flex-shrink-0",
              isRecording && "animate-pulse",
              isTranscribing && "opacity-50 cursor-not-allowed"
            )}
            disabled={isTranscribing}
            title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Start recording"}
          >
            {isRecording ? (
              <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : isTranscribing ? (
              <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-current rounded-full border-t-transparent" />
            ) : (
              <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>
          
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isMultiLine ? !(messageBoxes.some(box => box.content.trim()) || uploadedFiles.length > 0 || uploadedImages.length > 0) : !message.trim()}
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-primary hover:opacity-90 text-primary-foreground border-0 shadow-md hover:shadow-lg transition-all flex-shrink-0"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
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
