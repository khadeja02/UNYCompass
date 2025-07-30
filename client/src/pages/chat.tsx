import { useState, useEffect } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import type { PersonalityGroup } from '@/lib/personalityData';

import { ChatSidebar } from "@/components/ui/ChatSidebar";
import { ChatHeader } from "@/components/ui/ChatHeader";
import { ChatInput } from "@/components/ui/ChatInput";
import { PersonalitySelector } from "@/components/ui/PersonalitySelector";

import { useChatbot } from '@/hooks/useChatbot';
import { useChat } from '@/hooks/useChat';

export default function ChatPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const {
    chatbotStatus,
    showChatbotSuggestions,
    setShowChatbotSuggestions,
    resetChatbotState
  } = useChatbot();

  const {
    currentSessionId,
    messageInput,
    messages: savedMessages,
    textareaRef,
    messagesEndRef,
    setMessageInput,
    chatSessions,
    handleSendMessage,
    handleNewChat: chatHandleNewChat,
    handleChatSelect: chatHandleSelect,
    handleLoadMoreSessions,
    hasMoreSessions,
    isLoadingMoreSessions,
    isLoadingSessions,
    isLoading: chatIsLoading
  } = useChat();

  const [selectedPersonalityGroup, setSelectedPersonalityGroup] = useState<PersonalityGroup | null>(null);

  const displayMessages = savedMessages;
  const isLoading = chatIsLoading;

  useEffect(() => {
    if (!currentSessionId && displayMessages.length === 0) {
      setShowChatbotSuggestions(true);
    }
  }, [currentSessionId, displayMessages.length, setShowChatbotSuggestions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  const handlePersonalitySelect = (personalityCode: string) => {
    const prompt = `I am a ${personalityCode} personality type. Based on my personality, what Hunter College majors would you recommend for me and why?`;
    handleSendMessage(prompt, personalityCode);
    setSelectedPersonalityGroup(null);
    setShowChatbotSuggestions(false);
  };

  const handleUnknownPersonality = () => {
    const prompt = "I don't know my personality type. Can you help me find a Hunter College major that might be right for me? What questions should I consider?";
    handleSendMessage(prompt);
    setSelectedPersonalityGroup(null);
    setShowChatbotSuggestions(false);
  };

  const handleSuggestionClickLocal = (suggestion: string) => {
    handleSendMessage(suggestion);
    setShowChatbotSuggestions(false);
  };

  const handleInputSend = (content: string) => {
    handleSendMessage(content);
    if (!currentSessionId || displayMessages.length === 0) {
      setShowChatbotSuggestions(false);
    }
  };

  const handleNewChat = () => {
    chatHandleNewChat();
    setSelectedPersonalityGroup(null);
    resetChatbotState();
    setShowChatbotSuggestions(true);
  };

  const handleChatSelect = (chatId: number) => {
    chatHandleSelect(chatId);
    setSelectedPersonalityGroup(null);
    resetChatbotState();
    setShowChatbotSuggestions(false);
  };

  const showWelcomeScreen = !currentSessionId && displayMessages.length === 0 && showChatbotSuggestions;

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        currentSessionId={currentSessionId}
        chatbotStatus={chatbotStatus}
        chatSessions={chatSessions}
        onLoadMoreSessions={handleLoadMoreSessions}
        hasMoreSessions={hasMoreSessions}
        isLoadingMoreSessions={isLoadingMoreSessions}
        isLoadingSessions={isLoadingSessions}
      />

      <div className="flex-1 flex flex-col">
        <ChatHeader
          theme={theme}
          toggleTheme={toggleTheme}
          user={user}
          logout={logout}
        />

        <div className="flex-1 flex flex-col min-h-0">
          {showWelcomeScreen ? (
            <PersonalitySelector
              selectedPersonalityGroup={selectedPersonalityGroup}
              setSelectedPersonalityGroup={setSelectedPersonalityGroup}
              onPersonalitySelect={handlePersonalitySelect}
              onUnknownPersonality={handleUnknownPersonality}
              onSuggestionClick={handleSuggestionClickLocal}
              chatbotStatus={chatbotStatus}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                {displayMessages.map((message) => (
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