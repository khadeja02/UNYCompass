// src/hooks/useChat.ts
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ChatSession, Message } from '@shared/schema';

export const useChat = () => {
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Fetch chat sessions
    const { data: chatSessions = [] } = useQuery<ChatSession[]>({
        queryKey: ["/api/chat-sessions"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/chat-sessions");
            return response.json();
        },
    });

    // Fetch messages for current session
    const { data: sessionMessages = [] } = useQuery<Message[]>({
        queryKey: ["/api/messages", currentSessionId],
        queryFn: async () => {
            if (!currentSessionId) return [];
            const response = await apiRequest("GET", `/api/messages/${currentSessionId}`);
            return response.json();
        },
        enabled: !!currentSessionId,
    });

    // Create chat session mutation
    const createSessionMutation = useMutation({
        mutationFn: async (data: { personalityType?: string; title?: string }) => {
            const response = await apiRequest("POST", "/api/chat-sessions", data);
            return response.json();
        },
        onSuccess: (session: ChatSession) => {
            setCurrentSessionId(session.id);
            setMessages([]); // Clear messages for new session
            queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
        },
    });

    // Send message mutation - Uses the new backend with conversation context
    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!currentSessionId) throw new Error("No active session");

            const response = await apiRequest("POST", "/api/messages", {
                chatSessionId: currentSessionId,
                content,
                isUser: true,
            });
            return response.json();
        },
        onSuccess: (data) => {
            // Backend returns { userMessage, aiResponse }
            if (data.userMessage && data.aiResponse) {
                setMessages(prev => [...prev, data.userMessage, data.aiResponse]);
            }
            setMessageInput("");

            // Refresh session list to update timestamps
            queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/messages", currentSessionId] });
        },
    });

    // Update messages when session messages change (when switching chats)
    useEffect(() => {
        setMessages(sessionMessages);
    }, [sessionMessages]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [messageInput]);

    // Handle send message
    const handleSendMessage = async (content?: string, personalityType?: string) => {
        const messageContent = content || messageInput.trim();
        if (!messageContent) return;

        // If no active session, create one first
        if (!currentSessionId) {
            try {
                const session = await createSessionMutation.mutateAsync({
                    personalityType,
                    title: messageContent.slice(0, 50) + (messageContent.length > 50 ? '...' : '') // Auto-generate title
                });

                // Session will be set in the onSuccess callback, then send message
                setTimeout(() => {
                    sendMessageMutation.mutate(messageContent);
                }, 100);

            } catch (error) {
                console.error('Failed to create session:', error);
            }
        } else {
            // Send to existing session
            sendMessageMutation.mutate(messageContent);
        }
    };

    // Handle new chat
    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessageInput("");
        setMessages([]);
    };

    // Handle chat selection (switch to existing chat)
    const handleChatSelect = (chatId: number) => {
        if (chatId === currentSessionId) return; // Already selected

        setCurrentSessionId(chatId);
        setMessageInput("");
        // Messages will be loaded by the useQuery effect
    };

    // Generate chat title from first message
    const generateChatTitle = (firstMessage: string): string => {
        return firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    };

    const isLoading = sendMessageMutation.isPending || createSessionMutation.isPending;

    return {
        // State
        currentSessionId,
        messageInput,
        messages,

        // Refs
        textareaRef,
        messagesEndRef,

        // Setters
        setMessageInput,

        // Data
        chatSessions,

        // Actions
        handleSendMessage,
        handleNewChat,
        handleChatSelect,

        // Loading states
        isLoading,
    };
};