// src/hooks/useChat.ts - FIXED VERSION
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ChatSession, Message } from '@shared/schema';

export const useChat = () => {
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [pendingMessage, setPendingMessage] = useState<string | null>(null);

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

            // FIXED: Send pending message after session is created
            if (pendingMessage) {
                sendMessageMutation.mutate(pendingMessage);
                setPendingMessage(null);
            }
        },
    });

    // Send message mutation
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
                // For session-based chats, invalidate queries to refresh sessionMessages
                if (currentSessionId) {
                    queryClient.invalidateQueries({ queryKey: ["/api/messages", currentSessionId] });
                } else {
                    // For local chats, update local state
                    setMessages(prev => [...prev, data.userMessage, data.aiResponse]);
                }
            }
            setMessageInput("");

            // Refresh session list to update timestamps
            queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
        },
    });

    // Use sessionMessages directly instead of local state duplication
    // This eliminates the need for the problematic useEffect
    const displayMessages = currentSessionId ? sessionMessages : messages;

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [messageInput]);

    // FIXED: Handle send message without setTimeout
    const handleSendMessage = async (content?: string, personalityType?: string) => {
        const messageContent = content || messageInput.trim();
        if (!messageContent) return;

        // If no active session, create one first and store the message
        if (!currentSessionId) {
            setPendingMessage(messageContent);
            createSessionMutation.mutate({
                personalityType,
                title: messageContent.slice(0, 50) + (messageContent.length > 50 ? '...' : '')
            });
        } else {
            // Send to existing session immediately
            sendMessageMutation.mutate(messageContent);
        }
    };

    // Handle new chat
    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessageInput("");
        setMessages([]); // Clear local messages for new chat
        setPendingMessage(null); // Clear any pending message
    };

    // Handle chat selection (switch to existing chat)
    const handleChatSelect = (chatId: number) => {
        if (chatId === currentSessionId) return; // Already selected

        setCurrentSessionId(chatId);
        setMessageInput("");
        setPendingMessage(null); // Clear any pending message
        // sessionMessages will be loaded automatically by the useQuery
    };

    const isLoading = sendMessageMutation.isPending || createSessionMutation.isPending;

    return {
        // State
        currentSessionId,
        messageInput,
        messages: displayMessages, // Use the computed displayMessages

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