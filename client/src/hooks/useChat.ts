import { useState, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ChatSession, Message } from '@shared/schema';

interface ChatbotStatus {
    status: 'online' | 'offline' | 'checking';
    pythonWorking: boolean;
    message: string;
}

export const useChat = () => {
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [pendingMessage, setPendingMessage] = useState<string | null>(null);
    const [selectedPersonalityType, setSelectedPersonalityType] = useState<string>('chatbot');

    // 🤖 HUNTER AI STATUS STATE
    const [chatbotStatus, setChatbotStatus] = useState<ChatbotStatus>({
        status: 'checking',
        pythonWorking: false,
        message: 'Connecting to Hunter AI...'
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // 🔍 Check Hunter AI status through server
    const checkChatbotStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setChatbotStatus({
                    status: 'offline',
                    pythonWorking: false,
                    message: 'Authentication required'
                });
                return;
            }

            console.log('🔍 Checking Hunter AI status through server...');
            const response = await apiRequest("GET", "/api/chatbot/status");
            const data: ChatbotStatus = await response.json();

            setChatbotStatus({
                status: data.pythonWorking ? 'online' : 'offline',
                pythonWorking: data.pythonWorking,
                message: data.message
            });

            console.log('✅ Hunter AI status:', data);
        } catch (error) {
            console.error('❌ Hunter AI status check failed:', error);
            setChatbotStatus({
                status: 'offline',
                pythonWorking: false,
                message: 'Unable to connect to Hunter AI service'
            });
        }
    };

    // 📜 CHAT SESSIONS WITH PAGINATION
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

    // 💬 SESSION MESSAGES
    const { data: sessionMessages = [] } = useQuery<Message[]>({
        queryKey: ["/api/messages", currentSessionId],
        queryFn: async () => {
            if (!currentSessionId) return [];
            const response = await apiRequest("GET", `/api/messages/${currentSessionId}`);
            return response.json();
        },
        enabled: !!currentSessionId,
    });

    // 🆕 CREATE CHAT SESSION WITH PERSONALITY
    const createSessionMutation = useMutation({
        mutationFn: async (data: { personalityType?: string; title?: string }) => {
            console.log('🆕 Creating new Hunter AI chat session:', data);

            // Create session with personality type
            const response = await apiRequest("POST", "/api/chat-sessions", {
                personalityType: data.personalityType || selectedPersonalityType,
                title: data.title || 'Hunter AI Chat'
            });
            return response.json();
        },
        onSuccess: (session: ChatSession) => {
            console.log('✅ New Hunter AI session created:', session);
            setCurrentSessionId(session.id);
            setMessages([]);
            queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });

            // Send welcome message for new sessions
            const welcomeMessage: Message = {
                id: Date.now(),
                chatSessionId: session.id,
                content: "Hi! I'm Hunter AI, your personal advisor for Hunter College. I can help you with majors, programs, requirements, and more. What would you like to know?",
                isUser: false,
                createdAt: new Date(),
            };

            // Add welcome message to the new session
            setTimeout(() => {
                if (pendingMessage) {
                    sendMessageMutation.mutate(pendingMessage);
                    setPendingMessage(null);
                }
            }, 100);
        },
        onError: (error) => {
            alert(`Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setPendingMessage(null);
        }
    });

    // 📤 SEND MESSAGE TO HUNTER AI VIA SERVER
    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!currentSessionId) {
                throw new Error("No active session");
            }

            // Check if Hunter AI is available
            if (chatbotStatus.status === 'offline') {
                throw new Error('Hunter AI is currently offline. Please try again later.');
            }

            console.log('📤 Sending message to Hunter AI via server:', {
                sessionId: currentSessionId,
                content: content.substring(0, 50) + '...',
                personalityType: selectedPersonalityType
            });

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

            // Send to server (which will call Hunter AI Flask API)
            const response = await apiRequest("POST", "/api/messages", {
                chatSessionId: currentSessionId,
                content,
                isUser: true,
                personalityType: selectedPersonalityType // Include personality for Hunter AI
            });

            if (!response.ok) {
                // Remove temp message on error
                queryClient.setQueryData(
                    ["/api/messages", currentSessionId],
                    (oldMessages: Message[] = []) => oldMessages.filter(msg => msg.id !== tempUserMessage.id)
                );

                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message to Hunter AI');
            }

            return response.json();
        },
        onSuccess: (data) => {
            console.log('✅ Hunter AI response received via server:', {
                hasUserMessage: !!data.userMessage,
                hasAiResponse: !!data.aiResponse
            });

            // The server returns both userMessage and aiResponse from Hunter AI
            // Replace the entire messages cache with fresh data from server
            if (currentSessionId) {
                queryClient.invalidateQueries({ queryKey: ["/api/messages", currentSessionId] });
                queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
            }
            setMessageInput("");
        },
        onError: (error) => {
            console.error('❌ Hunter AI message error:', error);
            alert('Failed to send message to Hunter AI: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    // Display messages - prefer session messages for active sessions
    const displayMessages = currentSessionId ? sessionMessages : messages;

    // 🔄 Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages]);

    // 📏 Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [messageInput]);

    // 🔄 Check Hunter AI status and initialize on mount
    useEffect(() => {
        console.log('🚀 Initializing Hunter AI chat system...');
        checkChatbotStatus();
    }, []);

    // 🚀 MAIN MESSAGE SENDING FUNCTION
    const handleSendMessage = async (content?: string, personalityType?: string) => {
        const messageContent = content || messageInput.trim();
        if (!messageContent) return;

        console.log('🚀 handleSendMessage called:', {
            content: messageContent.substring(0, 50) + '...',
            personalityType: personalityType || selectedPersonalityType,
            hasSession: !!currentSessionId
        });

        // Check if Hunter AI is available
        if (chatbotStatus.status === 'offline') {
            alert('Hunter AI is currently offline. Please try again later.');
            return;
        }

        // Clear input immediately
        setMessageInput("");

        if (currentSessionId) {
            // For existing sessions, send with optimistic update
            console.log('📤 Sending to existing Hunter AI session:', currentSessionId);
            sendMessageMutation.mutate(messageContent);
        } else {
            // For new sessions, create session first then send message
            console.log('🆕 Creating new Hunter AI session first...');

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
                personalityType: personalityType || selectedPersonalityType,
                title: messageContent.slice(0, 50) + (messageContent.length > 50 ? '...' : '')
            });
        }
    };

    // 🆕 START NEW HUNTER AI CONVERSATION
    const handleNewChat = () => {
        console.log('🆕 Starting new Hunter AI conversation');
        setCurrentSessionId(null);
        setMessageInput("");
        setMessages([]);
        setPendingMessage(null);

        // Add initial welcome message for new chats
        const welcomeMessage: Message = {
            id: Date.now(),
            chatSessionId: 0,
            content: "Hi! I'm Hunter AI, your personal advisor for Hunter College. I can help you with majors, programs, requirements, and more. What would you like to know?",
            isUser: false,
            createdAt: new Date(),
        };
        setMessages([welcomeMessage]);
    };

    // 📋 SELECT EXISTING CHAT SESSION
    const handleChatSelect = (chatId: number) => {
        if (chatId === currentSessionId) return;
        console.log('📋 Selecting Hunter AI chat session:', chatId);
        setCurrentSessionId(chatId);
        setMessageInput("");
        setPendingMessage(null);
    };

    // 📄 LOAD MORE CHAT SESSIONS
    const handleLoadMoreSessions = () => {
        if (hasNextPage && !isFetchingNextPage) {
            console.log('📄 Loading more Hunter AI chat sessions...');
            fetchNextPage();
        }
    };

    // 🎯 HUNTER AI STATUS BADGE
    const getStatusBadge = () => {
        switch (chatbotStatus.status) {
            case 'online':
                return {
                    variant: 'secondary' as const,
                    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                    icon: 'CheckCircle',
                    text: 'Hunter AI Online'
                };
            case 'offline':
                return {
                    variant: 'secondary' as const,
                    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                    icon: 'AlertCircle',
                    text: 'Hunter AI Offline'
                };
            default:
                return {
                    variant: 'secondary' as const,
                    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                    icon: 'AlertCircle',
                    text: 'Connecting...'
                };
        }
    };

    const isLoading = sendMessageMutation.isPending || createSessionMutation.isPending;

    return {
        // 📱 CORE STATE
        currentSessionId,
        messageInput,
        messages: displayMessages,

        // 🤖 HUNTER AI STATE
        chatbotStatus,
        selectedPersonalityType,
        isLoading,

        // 🎯 REFS
        textareaRef,
        messagesEndRef,

        // 📋 CHAT SESSIONS
        chatSessions,
        hasMoreSessions: hasNextPage,
        isLoadingMoreSessions: isFetchingNextPage,
        isLoadingSessions,

        // ✏️ SETTERS
        setMessageInput,
        setSelectedPersonalityType,

        // 🚀 ACTIONS
        handleSendMessage,
        handleNewChat,
        handleChatSelect,
        handleLoadMoreSessions,
        checkChatbotStatus,
        getStatusBadge,

        // 🎯 HUNTER AI FLAGS
        isUsingChatbot: true, // Always true - this is Hunter AI mode
    };
};