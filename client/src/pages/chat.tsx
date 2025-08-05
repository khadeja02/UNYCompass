import { useState, useEffect } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import type { PersonalityGroup } from '@/lib/personalityData';

import { ChatSidebar } from "@/components/ui/ChatSidebar";
import { ChatHeader } from "@/components/ui/ChatHeader";
import { ChatInput } from "@/components/ui/ChatInput";
import { PersonalitySelector } from "@/components/ui/PersonalitySelector";
import { MarkdownMessage } from "@/components/ui/MarkdownMessage";
import { TypingIndicator } from "@/components/ui/TypingIndicator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bot } from "lucide-react";

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
              <div className="chat-messages flex-1 p-6 overflow-y-auto min-h-0 space-y-4">
                {displayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${message.isUser ? 'flex-row-reverse' : 'flex-row'
                      }`}
                  >
                    {/* Avatar */}
                    <Avatar className={`w-8 h-8 flex-shrink-0 ${message.isUser
                      ? 'bg-blue-600'
                      : 'bg-gray-600 dark:bg-gray-500'
                      }`}>
                      <AvatarFallback>
                        {message.isUser ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] ${message.isUser
                      ? 'bg-blue-100 text-gray-900 dark:bg-blue-200 dark:text-gray-800 rounded-2xl rounded-tr-md px-4 py-3 shadow-md'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm'
                      }`}>
                      <MarkdownMessage
                        content={message.content}
                        isUser={message.isUser}
                        className="chat-message"
                      />
                    </div>
                  </div>
                ))}

                {/* Show typing indicator when AI is responding */}
                {isLoading && <TypingIndicator />}

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