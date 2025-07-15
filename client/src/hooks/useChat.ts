// src/hooks/useChat.ts
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ChatSession, Message } from '@shared/schema';

export const useChat = () => {
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [pendingMessage, setPendingMessage] = useState<string>("");
    const [isUsingChatbot, setIsUsingChatbot] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Fetch chat sessions
    const { data: chatSessions } = useQuery<ChatSession[]>({
        queryKey: ["/api/chat-sessions"],
    });

    // Fetch messages for current session
    const { data: sessionMessages } = useQuery<Message[]>({
        queryKey: ["/api/messages", currentSessionId],
        enabled: !!currentSessionId,
    });

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

    // Send message mutation (personality system)
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

    // Update messages when session messages change
    useEffect(() => {
        if (sessionMessages) {
            setMessages(sessionMessages);
        }
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

    // Auto-send pending message when session is created (personality mode only)
    useEffect(() => {
        if (currentSessionId && currentSessionId > 0 && pendingMessage && !isUsingChatbot) {
            console.log('Auto-sending pending message to personality system');
            sendMessageMutation.mutate(pendingMessage);
            setPendingMessage("");
        }
    }, [currentSessionId, pendingMessage, isUsingChatbot, sendMessageMutation]);

    // Handle send message (personality mode)
    const handleSendMessage = () => {
        if (!messageInput.trim()) return;

        console.log('handleSendMessage:', { isUsingChatbot, currentSessionId });

        // Skip if in chatbot mode (handled by useChatbot)
        if (isUsingChatbot) {
            console.log('Skipping personality system - in chatbot mode');
            return;
        }

        console.log('Sending to personality system');

        if (!currentSessionId || currentSessionId <= 0) {
            console.log('Creating personality session first');
            setPendingMessage(messageInput.trim());
            // This will be handled by usePersonality hook
            return;
        }

        console.log('Sending message via personality mutation');
        sendMessageMutation.mutate(messageInput.trim());
    };
    // Handle new chat
    const handleNewChat = () => {
        // Reset all state to initial values without page reload
        setCurrentSessionId(null);
        setMessageInput("");
        setMessages([]);
        setPendingMessage("");
        setIsUsingChatbot(false);

        // Clear any query cache for the current session
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    };

    // Combined send message handler for both modes
    const handleSendMessageCombined = (
        chatbotSendFunction?: (content: string) => void
    ) => {
        if (!messageInput.trim()) return;

        if (isUsingChatbot && chatbotSendFunction) {
            chatbotSendFunction(messageInput.trim());
            setMessageInput(""); // Clear input immediately
        } else {
            handleSendMessage();
        }
    };

    const isLoading = sendMessageMutation.isPending || createSessionMutation.isPending;

    return {
        // State
        currentSessionId,
        messageInput,
        messages,
        pendingMessage,
        isUsingChatbot,

        // Refs
        textareaRef,
        messagesEndRef,

        // Setters
        setCurrentSessionId,
        setMessageInput,
        setMessages,
        setPendingMessage,
        setIsUsingChatbot,

        // Data
        chatSessions,

        // Actions
        handleSendMessage,
        handleSendMessageCombined,
        handleNewChat,
        createSessionMutation,

        // Loading states
        isLoading,
    };
};