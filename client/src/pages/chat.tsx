import { useState, useEffect, useRef } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import type { PersonalityGroup } from '@/lib/personalityData';
import type { Message } from '@shared/schema';

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
    sendChatbotMessage,
    handleUseChatbot,
    handleSuggestionClick,
    isChatbotLoading,
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
    isLoading: chatIsLoading
  } = useChat();

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [selectedPersonalityGroup, setSelectedPersonalityGroup] = useState<PersonalityGroup | null>(null);
  const [isUsingChatbot, setIsUsingChatbot] = useState(true);

  const displayMessages = currentSessionId ? savedMessages : localMessages;
  const isLoading = currentSessionId ? chatIsLoading : isChatbotLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  useEffect(() => {
    if (!currentSessionId) {
      handleUseChatbot(
        setLocalMessages,
        () => { },
        () => { },
        () => { },
        setIsUsingChatbot
      );
    }
  }, [currentSessionId]);

  const handlePersonalitySelect = (personalityCode: string) => {
    const prompt = `I am a ${personalityCode} personality type. Based on my personality, what Hunter College majors would you recommend for me and why?`;
    currentSessionId
      ? handleSendMessage(prompt, personalityCode)
      : sendChatbotMessage(prompt, setLocalMessages);
    setSelectedPersonalityGroup(null);
  };

  const handleUnknownPersonality = () => {
    const prompt = "I don't know my personality type. Can you help me find a Hunter College major that might be right for me? What questions should I consider?";
    currentSessionId
      ? handleSendMessage(prompt)
      : sendChatbotMessage(prompt, setLocalMessages);
    setSelectedPersonalityGroup(null);
  };

  const handleSuggestionClickLocal = (suggestion: string) => {
    if (currentSessionId) {
      setMessageInput(suggestion);
      handleSendMessage(suggestion);
    } else {
      sendChatbotMessage(suggestion, setLocalMessages);
    }
  };

  const handleInputSend = (content: string) => {
    currentSessionId
      ? handleSendMessage(content)
      : sendChatbotMessage(content, setLocalMessages);
    if (!currentSessionId) setMessageInput("");
  };

  const handleNewChat = () => {
    chatHandleNewChat();
    setLocalMessages([]);
    setSelectedPersonalityGroup(null);
    resetChatbotState();
    setIsUsingChatbot(true);
    handleUseChatbot(
      setLocalMessages,
      () => { },
      () => { },
      () => { },
      setIsUsingChatbot
    );
  };

  const handleChatSelect = (chatId: number) => {
    chatHandleSelect(chatId);
    setIsUsingChatbot(false);
    setSelectedPersonalityGroup(null);
    resetChatbotState();
  };

  const showWelcomeScreen = !currentSessionId && displayMessages.length === 0 && showChatbotSuggestions;

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        currentSessionId={currentSessionId}
        chatbotStatus={chatbotStatus}
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
          messageInput={currentSessionId ? messageInput : ""}
          setMessageInput={currentSessionId ? setMessageInput : () => { }}
          onSendMessage={handleInputSend}
          isLoading={isLoading}
          chatbotStatus={chatbotStatus}
        />
      </div>
    </div>
  );
}
