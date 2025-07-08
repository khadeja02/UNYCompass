import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";
import { Compass, Plus, Send, User, Settings, HelpCircle, LogOut, Moon, Sun } from "lucide-react";
import type { PersonalityType, ChatSession, Message } from "@shared/schema";

export default function ChatPage() {
  const [selectedPersonalityType, setSelectedPersonalityType] = useState<string>("");
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  // Fetch personality types
  const { data: personalityTypes } = useQuery<PersonalityType[]>({
    queryKey: ["/api/personality-types"],
  });

  // Fetch chat sessions
  const { data: chatSessions } = useQuery<ChatSession[]>({
    queryKey: ["/api/chat-sessions"],
  });

  // Fetch messages for current session
  const { data: sessionMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages", currentSessionId],
    enabled: !!currentSessionId,
  });

  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages);
    }
  }, [sessionMessages]);

  // Create chat session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (personalityType: string) => {
      const response = await apiRequest("POST", "/api/chat-sessions", {
        personalityType,
      });
      return response.json();
    },
    onSuccess: (session: ChatSession) => {
      setCurrentSessionId(session.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentSessionId) return;
      const response = await apiRequest("POST", "/api/messages", {
        chatSessionId: currentSessionId,
        content,
        isUser: true,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, data.userMessage, data.aiResponse]);
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", currentSessionId] });
    },
  });

  const handlePersonalityTypeSelect = (type: string) => {
    setSelectedPersonalityType(type);
    createSessionMutation.mutate(type);
  };

  const handleSendMessage = () => {
    if (messageInput.trim() && currentSessionId) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };

  const handleNewChat = () => {
    window.location.reload();
  };

  const handleUnknownPersonalityType = () => {
    setSelectedPersonalityType("unknown");
    createSessionMutation.mutate("unknown");
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [messageInput]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-purple-700 to-purple-900 dark:from-purple-800 dark:to-purple-950 flex flex-col h-full">
        <div className="p-6">
          <Button
            onClick={handleNewChat}
            className="w-full bg-black bg-opacity-20 hover:bg-opacity-30 text-white border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 px-6">
          {/* Chat history would go here */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-background dark:bg-background shadow-sm px-6 py-4 flex justify-between items-center border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </Button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=40&h=40" />
                  <AvatarFallback>YN</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-sm font-medium">Your name</div>
                  <div className="text-xs text-gray-500">yourname@gmail.com</div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => alert("Profile functionality coming soon!")}>
                <User className="w-4 h-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Settings functionality coming soon!")}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Help functionality coming soon!")}>
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => alert("Logout functionality coming soon!")}>
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {!currentSessionId ? (
            // Initial state with personality selection
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              {/* Logo */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-purple-600 flex items-center justify-center">
                      <Compass className="text-purple-600 w-8 h-8" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-purple-600">UNY</h1>
                    <h2 className="text-xl font-semibold text-gray-600">COMPASS</h2>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-300 text-center max-w-md mb-12">
                The chatbot designed to give you advice on the Hunter major that best suits your interests and personality
              </p>

              {/* Personality Type Selection */}
              <div className="w-full max-w-2xl">
                <h3 className="text-gray-700 dark:text-gray-300 text-center mb-6">Choose your personality type:</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {personalityTypes?.map((type) => (
                    <Tooltip key={type.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className={`p-4 h-auto text-left justify-start hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 ${
                            selectedPersonalityType === type.name.toLowerCase()
                              ? "border-purple-500 bg-purple-100 dark:bg-purple-900"
                              : ""
                          }`}
                          onClick={() => handlePersonalityTypeSelect(type.name.toLowerCase())}
                          disabled={sendMessageMutation.isPending || createSessionMutation.isPending}
                        >
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">{type.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{type.code}</div>
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{type.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                
                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium underline"
                    onClick={handleUnknownPersonalityType}
                    disabled={sendMessageMutation.isPending || createSessionMutation.isPending}
                  >
                    I Don't know my personality type
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Chat interface
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-6 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 ${
                      message.isUser ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isUser
                          ? "bg-purple-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-background dark:bg-background border-t border-border p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  placeholder="Send a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="resize-none min-h-[44px] max-h-[120px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || !currentSessionId || sendMessageMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white p-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
