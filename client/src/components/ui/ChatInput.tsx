// client/src/components/ui/ChatInput.tsx
import { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    chatbotStatus: {
        status: 'online' | 'offline' | 'checking';
        message: string;
    };
}

export function ChatInput({
    messageInput,
    setMessageInput,
    onSendMessage,
    isLoading,
    chatbotStatus
}: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [messageInput]);

    const handleSend = () => {
        if (messageInput.trim()) {
            onSendMessage(messageInput.trim());
            setMessageInput("");
        }
    };

    return (
        <div className="bg-background border-t border-border p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-end gap-4">
                    <div className="flex-1">
                        <Textarea
                            ref={textareaRef}
                            placeholder="Ask Hunter AI about programs, admissions, or academic pathways..."
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            className="resize-none min-h-[44px] max-h-[120px]"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            disabled={chatbotStatus.status === 'offline'}
                        />
                    </div>
                    <Button
                        onClick={handleSend}
                        disabled={!messageInput.trim() || isLoading || chatbotStatus.status === 'offline'}
                        className="bg-purple-600 hover:bg-purple-700 text-white p-3"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>

                {chatbotStatus.status === 'offline' && (
                    <p className="text-sm text-red-600 mt-2 text-center">
                        Hunter AI is currently offline: {chatbotStatus.message}
                    </p>
                )}
            </div>
        </div>
    );
}