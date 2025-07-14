// src/hooks/useChatbot.ts
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Message, ChatbotResponse } from '@shared/schema';

interface ChatbotStatus {
    status: 'online' | 'offline' | 'checking';
    pythonWorking: boolean;
    message: string;
}

export const useChatbot = () => {
    const [chatbotStatus, setChatbotStatus] = useState<ChatbotStatus>({
        status: 'checking',
        pythonWorking: false,
        message: 'Connecting...'
    });
    const [showChatbotSuggestions, setShowChatbotSuggestions] = useState(false);

    // Check chatbot status
    const checkChatbotStatus = async () => {
        try {
            // Only check status if user is authenticated
            const token = localStorage.getItem('token');
            if (!token) {
                setChatbotStatus({
                    status: 'offline',
                    pythonWorking: false,
                    message: 'Authentication required'
                });
                return;
            }

            const response = await apiRequest("GET", "/api/chatbot/status");
            const data: ChatbotStatus = await response.json();

            setChatbotStatus({
                status: data.pythonWorking ? 'online' : 'offline',
                pythonWorking: data.pythonWorking,
                message: data.message
            });
        } catch (error) {
            console.error('Chatbot status check failed:', error);
            setChatbotStatus({
                status: 'offline',
                pythonWorking: false,
                message: 'Unable to connect to chatbot service'
            });
        }
    };

    // Send chatbot message mutation
    const sendChatbotMutation = useMutation({
        mutationFn: async (data: { question: string; personalityType?: string }) => {
            console.log('Sending to chatbot API:', data);

            const response = await apiRequest("POST", "/api/chatbot/ask", {
                question: data.question,
                personalityType: data.personalityType || 'chatbot',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const responseData = await response.json();
            console.log('Chatbot API response:', responseData);

            return responseData;
        },
        onSuccess: (data) => {
            console.log('Hunter AI response received:', data);
        },
        onError: (error) => {
            console.error('Hunter AI error:', error);
        },
    });

    // Send chatbot message function
    const sendChatbotMessage = (
        content: string,
        setMessages: (updateFn: (prev: Message[]) => Message[]) => void
    ) => {
        console.log('🚀 sendChatbotMessage called with:', content);
        console.log('🚀 setMessages type:', typeof setMessages);

        // Add user message immediately
        const userMessage: Message = {
            id: Date.now(),
            chatSessionId: 0,
            content: content,
            isUser: true,
            createdAt: new Date(),
        };

        console.log('👤 Adding user message:', userMessage);

        // Test the setMessages function
        setMessages(prev => {
            console.log('📝 Previous messages:', prev);
            const newMessages = [...prev, userMessage];
            console.log('📝 New messages:', newMessages);
            return newMessages;
        });

        console.log('✅ User message added, now calling API...');

        sendChatbotMutation.mutate(
            {
                question: content,
                personalityType: 'chatbot'
            },
            {
                onSuccess: (data) => {
                    console.log('✅ API Success:', data);

                    const botMessage: Message = {
                        id: Date.now() + 1,
                        chatSessionId: 0,
                        content: data.success ? data.answer : `❌ Error: ${data.error || 'Failed to get response'}`,
                        isUser: false,
                        createdAt: new Date(),
                    };

                    console.log('🤖 Adding bot message:', botMessage);
                    setMessages(prev => [...prev, botMessage]);
                },
                onError: (error: any) => {
                    console.error('❌ API Error:', error);

                    const errorMessage: Message = {
                        id: Date.now() + 1,
                        chatSessionId: 0,
                        content: `❌ ${error.message || 'Network error. Please check your connection and try again.'}`,
                        isUser: false,
                        createdAt: new Date(),
                    };

                    console.log('⚠️ Adding error message:', errorMessage);
                    setMessages(prev => [...prev, errorMessage]);
                }
            }
        );
    };

    // Handle chatbot activation
    const handleUseChatbot = (
        setMessages: (messages: Message[]) => void,
        setCurrentSessionId: (id: number | null) => void,
        setPendingMessage: (message: string) => void,
        setSelectedPersonalityType: (type: string) => void,
        setIsUsingChatbot: (using: boolean) => void
    ) => {
        console.log('Activating Hunter AI mode');

        // Clear everything first
        setMessages([]);
        setCurrentSessionId(-2); // Use -2 for chatbot mode instead of null
        setPendingMessage("");
        setSelectedPersonalityType("chatbot");

        // Then set chatbot mode
        setIsUsingChatbot(true);
        setShowChatbotSuggestions(true);

        if (chatbotStatus.status === 'offline') {
            alert('Chatbot is currently offline. Please try again later.');
            setIsUsingChatbot(false); // Reset if offline
            return;
        }

        console.log('Hunter AI mode activated successfully');
    };

    // Handle suggestion click
    const handleSuggestionClick = (
        suggestion: string,
        setMessageInput: (input: string) => void,
        setMessages: (updateFn: (prev: Message[]) => Message[]) => void
    ) => {
        setMessageInput(suggestion);
        // Auto-send the suggestion
        sendChatbotMessage(suggestion, setMessages);
    };
    const resetChatbotState = () => {
        setShowChatbotSuggestions(false);
        // Don't reset chatbotStatus - we want to keep it loaded
    };
    // Get status badge data
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

    // Initialize chatbot status check
    useEffect(() => {
        checkChatbotStatus();
    }, []);

    return {
        // State
        chatbotStatus,
        showChatbotSuggestions,

        // Setters
        setShowChatbotSuggestions,

        // Actions
        sendChatbotMessage,
        handleUseChatbot,
        handleSuggestionClick,
        checkChatbotStatus,
        getStatusBadge,

        // Loading state
        isChatbotLoading: sendChatbotMutation.isPending,
        // ... other returns
        resetChatbotState,
    };
};