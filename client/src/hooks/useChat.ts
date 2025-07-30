// src/hooks/useChat.ts
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

    const { data: chatSessions = [] } = useQuery<ChatSession[]>({
        queryKey: ["/api/chat-sessions"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/chat-sessions");
            const data = await response.json();
            return data;
        },
    });

    const { data: sessionMessages = [] } = useQuery<Message[]>({
        queryKey: ["/api/messages", currentSessionId],
        queryFn: async () => {
            if (!currentSessionId) return [];
            const response = await apiRequest("GET", `/api/messages/${currentSessionId}`);
            const data = await response.json();
            return data;
        },
        enabled: !!currentSessionId,
    });

    const createSessionMutation = useMutation({
        mutationFn: async (data: { personalityType?: string; title?: string }) => {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/chat-sessions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Session creation failed:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            return result;
        },
        onSuccess: (session: ChatSession) => {
            setCurrentSessionId(session.id);
            setMessages([]);
            queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });

            if (pendingMessage) {
                setTimeout(() => {
                    sendMessageMutation.mutate(pendingMessage);
                    setPendingMessage(null);
                }, 100);
            }
        },
        onError: (error) => {
            console.error('Session creation failed:', error);
            alert(`Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setPendingMessage(null);
        }
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!currentSessionId) {
                throw new Error("No active session");
            }

            const tempUserMessage: Message = {
                id: Date.now(),
                chatSessionId: currentSessionId,
                content,
                isUser: true,
                createdAt: new Date()
            };

            queryClient.setQueryData(
                ["/api/messages", currentSessionId],
                (oldMessages: Message[] = []) => [...oldMessages, tempUserMessage]
            );

            const response = await apiRequest("POST", "/api/messages", {
                chatSessionId: currentSessionId,
                content,
                isUser: true,
            });

            if (!response.ok) {
                queryClient.setQueryData(
                    ["/api/messages", currentSessionId],
                    (oldMessages: Message[] = []) => oldMessages.filter(msg => msg.id !== tempUserMessage.id)
                );

                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }

            const data = await response.json();
            return data;
        },
        onSuccess: () => {
            if (currentSessionId) {
                queryClient.invalidateQueries({ queryKey: ["/api/messages", currentSessionId] });
                queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
            }

            setMessageInput("");
        },
        onError: (error) => {
            console.error('Message send error:', error);
            alert('Failed to send message: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    const displayMessages = currentSessionId ? sessionMessages : messages;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [messageInput]);

    const handleSendMessage = async (content?: string, personalityType?: string) => {
        const messageContent = content || messageInput.trim();
        if (!messageContent) return;

        if (!currentSessionId) {
            setPendingMessage(messageContent);
            createSessionMutation.mutate({
                personalityType,
                title: messageContent.slice(0, 50) + (messageContent.length > 50 ? '...' : '')
            });
        } else {
            sendMessageMutation.mutate(messageContent);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessageInput("");
        setMessages([]);
        setPendingMessage(null);
    };

    const handleChatSelect = (chatId: number) => {
        if (chatId === currentSessionId) return;
        setCurrentSessionId(chatId);
        setMessageInput("");
        setPendingMessage(null);
    };

    const isLoading = sendMessageMutation.isPending || createSessionMutation.isPending;

    return {
        currentSessionId,
        messageInput,
        messages: displayMessages,
        textareaRef,
        messagesEndRef,
        setMessageInput,
        chatSessions,
        handleSendMessage,
        handleNewChat,
        handleChatSelect,
        isLoading,
    };
};
