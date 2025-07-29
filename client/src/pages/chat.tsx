// client/src/pages/chat.tsx - Fixed to use chatbot
import { useState, useEffect, useRef } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import type { PersonalityGroup } from '@/lib/personalityData';
import type { Message } from '@shared/schema';

// Import components
import { ChatSidebar } from "@/components/ui/ChatSidebar";
import { ChatHeader } from "@/components/ui/ChatHeader";
import { ChatInput } from "@/components/ui/ChatInput";
import { PersonalitySelector } from "@/components/ui/PersonalitySelector";

// Import the chatbot hook instead of chat hook
import { useChatbot } from '@/hooks/useChatbot';

export default function ChatPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  // Use the chatbot hook
  const {
    chatbotStatus,
    sendChatbotMessage,
    handleUseChatbot,
    handleSuggestionClick,
    isChatbotLoading,
    showChatbotSuggestions,
    setShowChatbotSuggestions,
    resetChatbotState
  } = useChatbot();

  // Local state for chat interface
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [selectedPersonalityGroup, setSelectedPersonalityGroup] = useState<PersonalityGroup | null>(null);
  const [isUsingChatbot, setIsUsingChatbot] = useState(true); // Default to chatbot mode
  const [pendingMessage, setPendingMessage] = useState('');
  const [selectedPersonalityType, setSelectedPersonalityType] = useState('chatbot');

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chatbot mode on load
  useEffect(() => {
    handleUseChatbot(
      setMessages,
      setCurrentSessionId,
      setPendingMessage,
      setSelectedPersonalityType,
      setIsUsingChatbot
    );
  }, []);

  // Handle personality selection (creates new chat with personality context)
  const handlePersonalitySelect = (personalityCode: string) => {
    const prompt = `I am a ${personalityCode} personality type. Based on my personality, what Hunter College majors would you recommend for me and why?`;
    sendChatbotMessage(prompt, setMessages);
    setSelectedPersonalityGroup(null); // Hide selector after selection
  };

  // Handle unknown personality
  const handleUnknownPersonality = () => {
    const prompt = "I don't know my personality type. Can you help me find a Hunter College major that might be right for me? What questions should I consider?";
    sendChatbotMessage(prompt, setMessages);
    setSelectedPersonalityGroup(null); // Hide selector after selection
  };

  // Handle suggestion clicks
  const handleSuggestionClickLocal = (suggestion: string) => {
    setMessageInput(suggestion);
    sendChatbotMessage(suggestion, setMessages);
  };

  // Handle input send
  const handleInputSend = (content: string) => {
    sendChatbotMessage(content, setMessages);
    setMessageInput("");
  };

  // Handle new chat
  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setSelectedPersonalityGroup(null);
    setMessageInput('');
    resetChatbotState();

    // Re-initialize chatbot mode
    handleUseChatbot(
      setMessages,
      setCurrentSessionId,
      setPendingMessage,
      setSelectedPersonalityType,
      setIsUsingChatbot
    );
  };

  // Handle chat selection (for now, just reset to new chat since we're in chatbot mode)
  const handleChatSelect = (chatId: number) => {
    // For now, just start a new chat since we're focused on chatbot functionality
    handleNewChat();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with chat history */}
      <ChatSidebar
        onNewChat={handleNewChat}
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
          {messages.length === 0 && showChatbotSuggestions ? (
            // Welcome screen with personality selection (only when no messages)
            <PersonalitySelector
              selectedPersonalityGroup={selectedPersonalityGroup}
              setSelectedPersonalityGroup={setSelectedPersonalityGroup}
              onPersonalitySelect={handlePersonalitySelect}
              onUnknownPersonality={handleUnknownPersonality}
              onSuggestionClick={handleSuggestionClickLocal}
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

                {isChatbotLoading && (
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
          isLoading={isChatbotLoading}
          chatbotStatus={chatbotStatus}
        />
      </div>
    </div>
  );
}