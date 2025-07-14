// client/src/pages/chat.tsx - Refactored with components
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from '@/lib/queryClient';
import type { Message } from '@shared/schema';
import type { PersonalityGroup } from '@/lib/personalityData';

// Import our new components
import { ChatSidebar } from "@/components/ui/ChatSidebar";
import { ChatHeader } from "@/components/ui/ChatHeader";
import { ChatInput } from "@/components/ui/ChatInput";
import { PersonalitySelector } from "@/components/ui/PersonalitySelector";

export default function ChatPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [selectedPersonalityGroup, setSelectedPersonalityGroup] = useState<PersonalityGroup | null>(null);
  const [chatbotStatus, setChatbotStatus] = useState({
    status: 'checking' as 'online' | 'offline' | 'checking',
    message: 'Connecting...'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check chatbot status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await apiRequest("GET", "/api/chatbot/status");
        const data = await response.json();
        setChatbotStatus({
          status: data.pythonWorking ? 'online' : 'offline',
          message: data.message
        });
      } catch (error) {
        setChatbotStatus({ status: 'offline', message: 'Unable to connect' });
      }
    };
    checkStatus();
  }, []);

  // Send message to Hunter AI
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { question: string; personalityType?: string }) => {
      const response = await apiRequest("POST", "/api/chatbot/ask", {
        question: data.question,
        personalityType: data.personalityType || 'chatbot',
      });
      return response.json();
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (content: string, personalityType?: string) => {
    if (!content.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now(),
      chatSessionId: 0,
      content: content,
      isUser: true,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to Hunter AI
    sendMessageMutation.mutate(
      { question: content, personalityType },
      {
        onSuccess: (data) => {
          const botMessage: Message = {
            id: Date.now() + 1,
            chatSessionId: 0,
            content: data.success ? data.answer : `❌ Error: ${data.error || 'Failed to get response'}`,
            isUser: false,
            createdAt: new Date(),
          };
          setMessages(prev => [...prev, botMessage]);
        },
        onError: (error: any) => {
          const errorMessage: Message = {
            id: Date.now() + 1,
            chatSessionId: 0,
            content: `❌ ${error.message || 'Network error'}`,
            isUser: false,
            createdAt: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    );
  };

  const handlePersonalitySelect = (personalityCode: string) => {
    const prompt = `I am a ${personalityCode} personality type. Based on my personality, what Hunter College majors would you recommend for me and why?`;
    handleSendMessage(prompt, personalityCode.toLowerCase());
  };

  const handleUnknownPersonality = () => {
    const prompt = "I don't know my personality type. Can you help me find a Hunter College major that might be right for me? What questions should I consider?";
    handleSendMessage(prompt, 'unknown');
  };

  const handleNewChat = () => {
    setMessages([]);
    setMessageInput("");
    setSelectedPersonalityGroup(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ChatSidebar
        onNewChat={handleNewChat}
        chatbotStatus={chatbotStatus}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <ChatHeader
          theme={theme}
          toggleTheme={toggleTheme}
          user={user}
          logout={logout}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {messages.length === 0 ? (
            // Welcome screen with personality selection
            <PersonalitySelector
              selectedPersonalityGroup={selectedPersonalityGroup}
              setSelectedPersonalityGroup={setSelectedPersonalityGroup}
              onPersonalitySelect={handlePersonalitySelect}
              onUnknownPersonality={handleUnknownPersonality}
              onSuggestionClick={handleSuggestionClick}
              chatbotStatus={chatbotStatus}
            />
          ) : (
            // Chat interface
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                {messages.map((message) => (
                  <div key={message.id} className={`mb-4 ${message.isUser ? "text-right" : "text-left"}`}>
                    <div className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.isUser ? "bg-purple-600 text-white" : "bg-gray-200 dark:bg-gray-700"
                      }`}>
                      {message.content}
                    </div>
                  </div>
                ))}

                {sendMessageMutation.isPending && (
                  <div className="text-left mb-4">
                    <div className="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                        <span className="text-gray-600 dark:text-gray-400">Hunter AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Message Input - Always visible */}
        <ChatInput
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
          chatbotStatus={chatbotStatus}
        />
      </div>
    </div>
  );
}