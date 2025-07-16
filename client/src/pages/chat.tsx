// client/src/pages/chat.tsx - Integrated with persistent storage
import { useState, useEffect } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from '@/lib/queryClient';
import type { PersonalityGroup } from '@/lib/personalityData';

// Import components
import { ChatSidebar } from "@/components/ui/ChatSidebar";
import { ChatHeader } from "@/components/ui/ChatHeader";
import { ChatInput } from "@/components/ui/ChatInput";
import { PersonalitySelector } from "@/components/ui/PersonalitySelector";

// Import the updated useChat hook
import { useChat } from '@/hooks/useChat';

export default function ChatPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  // Use the updated chat hook that connects to persistent storage
  const {
    currentSessionId,
    messageInput,
    messages,
    textareaRef,
    messagesEndRef,
    setMessageInput,
    chatSessions,
    handleSendMessage,
    handleNewChat,
    handleChatSelect,
    isLoading,
  } = useChat();

  // State for personality selection (only for welcome screen)
  const [selectedPersonalityGroup, setSelectedPersonalityGroup] = useState<PersonalityGroup | null>(null);
  const [chatbotStatus, setChatbotStatus] = useState({
    status: 'checking' as 'online' | 'offline' | 'checking',
    message: 'Connecting...'
  });

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

  // Handle personality selection (creates new chat with personality context)
  const handlePersonalitySelect = (personalityCode: string) => {
    const prompt = `I am a ${personalityCode} personality type. Based on my personality, what Hunter College majors would you recommend for me and why?`;
    handleSendMessage(prompt, personalityCode.toLowerCase());
  };

  // Handle unknown personality
  const handleUnknownPersonality = () => {
    const prompt = "I don't know my personality type. Can you help me find a Hunter College major that might be right for me? What questions should I consider?";
    handleSendMessage(prompt, 'unknown');
  };

  // Handle suggestion clicks
  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  // Handle input send
  const handleInputSend = (content: string) => {
    handleSendMessage(content);
  };

  // Reset personality selection when starting new chat
  const handleNewChatWithReset = () => {
    handleNewChat();
    setSelectedPersonalityGroup(null);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with chat history */}
      <ChatSidebar
        onNewChat={handleNewChatWithReset}
        onChatSelect={handleChatSelect}
        currentSessionId={currentSessionId}
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
          {messages.length === 0 && !currentSessionId ? (
            // Welcome screen with personality selection (only when no active chat)
            <PersonalitySelector
              selectedPersonalityGroup={selectedPersonalityGroup}
              setSelectedPersonalityGroup={setSelectedPersonalityGroup}
              onPersonalitySelect={handlePersonalitySelect}
              onUnknownPersonality={handleUnknownPersonality}
              onSuggestionClick={handleSuggestionClick}
              chatbotStatus={chatbotStatus}
            />
          ) : (
            // Chat interface (for active chats)
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                {messages.map((message) => (
                  <div key={message.id} className={`mb-4 ${message.isUser ? "text-right" : "text-left"}`}>
                    <div className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.isUser
                        ? "bg-purple-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700"
                      }`}>
                      {message.content}
                    </div>
                  </div>
                ))}

                {isLoading && (
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
          onSendMessage={handleInputSend}
          isLoading={isLoading}
          chatbotStatus={chatbotStatus}
        />
      </div>
    </div>
  );
}