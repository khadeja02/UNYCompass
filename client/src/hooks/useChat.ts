import { useState, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

    const {
        data: chatSessionsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingSessions
    } = useInfiniteQuery({
        queryKey: ["/api/chat-sessions"],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await apiRequest("GET", `/api/chat-sessions?page=${pageParam}&limit=10`);
            const data = await response.json();

            if (Array.isArray(data)) {
                return {
                    sessions: data,
                    pagination: {
                        currentPage: pageParam,
                        hasMore: false,
                        totalPages: 1,
                        totalSessions: data.length
                    }
                };
            } else {
                return data;
            }
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage.pagination) {
                return undefined;
            }

            const hasMore = lastPage.pagination.hasMore;
            const nextPage = hasMore ? lastPage.pagination.currentPage + 1 : undefined;
            return nextPage;
        },
        initialPageParam: 1,
    });

    const chatSessions = chatSessionsData?.pages.flatMap((page) => {
        return page.sessions || page;
    }) ?? [];

    const { data: sessionMessages = [] } = useQuery<Message[]>({
        queryKey: ["/api/messages", currentSessionId],
        queryFn: async () => {
            if (!currentSessionId) return [];
            const response = await apiRequest("GET", `/api/messages/${currentSessionId}`);
            return response.json();
        },
        enabled: !!currentSessionId,
    });

    const createSessionMutation = useMutation({
        mutationFn: async (data: { personalityType?: string; title?: string }) => {
            // ✅ Use apiRequest instead of direct fetch
            const response = await apiRequest("POST", "/api/chat-sessions", data);
            return response.json();
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
            alert(`Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setPendingMessage(null);
        }
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!currentSessionId) {
                throw new Error("No active session");
            }

            // Add optimistic user message immediately
            const tempUserMessage: Message = {
                id: -Date.now(), // Use negative number for temp messages
                chatSessionId: currentSessionId,
                content: content,
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
                // Remove temp message on error
                queryClient.setQueryData(
                    ["/api/messages", currentSessionId],
                    (oldMessages: Message[] = []) => oldMessages.filter(msg => msg.id !== tempUserMessage.id)
                );

                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }

            return response.json();
        },
        onSuccess: (data) => {
            // The server returns both userMessage and aiResponse
            // Replace the entire messages cache with fresh data from server
            if (currentSessionId) {
                queryClient.invalidateQueries({ queryKey: ["/api/messages", currentSessionId] });
                queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
            }
            setMessageInput("");
        },
        onError: (error) => {
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

        // Clear input immediately
        setMessageInput("");

        if (currentSessionId) {
            // For existing sessions, send with optimistic update
            sendMessageMutation.mutate(messageContent);
        } else {
            // For new sessions, add to local messages temporarily
            const tempUserMessage: Message = {
                id: Date.now(),
                chatSessionId: 0,
                content: messageContent,
                isUser: true,
                createdAt: new Date()
            };

            setMessages(prev => [...prev, tempUserMessage]);

            setPendingMessage(messageContent);
            createSessionMutation.mutate({
                personalityType,
                title: messageContent.slice(0, 50) + (messageContent.length > 50 ? '...' : '')
            });
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

    const handleLoadMoreSessions = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
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
        handleLoadMoreSessions,
        hasMoreSessions: hasNextPage,
        isLoadingMoreSessions: isFetchingNextPage,
        isLoadingSessions,
        isLoading,
    };
};