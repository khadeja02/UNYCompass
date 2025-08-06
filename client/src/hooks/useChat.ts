import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Message } from '@shared/schema';

interface ChatbotStatus {
    status: 'online' | 'offline' | 'checking';
    pythonWorking: boolean;
    message: string;
}

export const useChat = () => {
    // 🤖 HUNTER AI ONLY STATE
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatbotStatus, setChatbotStatus] = useState<ChatbotStatus>({
        status: 'checking',
        pythonWorking: false,
        message: 'Connecting to Hunter AI...'
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 🔍 Check Hunter AI status on load
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

            console.log('🔍 Checking Hunter AI status...');
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

    // 🤖 HUNTER AI MESSAGE MUTATION
    const sendHunterAIMutation = useMutation({
        mutationFn: async (data: { question: string; personalityType?: string }) => {
            console.log('🚀 Sending to Hunter AI API:', data);

            const response = await apiRequest("POST", "/api/chatbot/ask", {
                question: data.question,
                personalityType: data.personalityType || 'chatbot',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const responseData = await response.json();
            console.log('✅ Hunter AI response received:', responseData);

            return responseData;
        },
        onSuccess: (data) => {
            console.log('🎉 Hunter AI success:', data);
        },
        onError: (error) => {
            console.error('❌ Hunter AI error:', error);
        },
    });

    // 🚀 MAIN MESSAGE SENDING FUNCTION (HUNTER AI ONLY)
    const handleSendMessage = async (content?: string, personalityType?: string) => {
        const messageContent = content || messageInput.trim();
        if (!messageContent) return;

        console.log('🚀 handleSendMessage called with:', messageContent);

        // Check if Hunter AI is available
        if (chatbotStatus.status === 'offline') {
            alert('Hunter AI is currently offline. Please try again later.');
            return;
        }

        // Clear input immediately
        setMessageInput("");

        // Add user message immediately to UI
        const userMessage: Message = {
            id: Date.now(),
            chatSessionId: 0, // Not used for Hunter AI
            content: messageContent,
            isUser: true,
            createdAt: new Date(),
        };

        console.log('👤 Adding user message:', userMessage);
        setMessages(prev => [...prev, userMessage]);

        // Send to Hunter AI
        sendHunterAIMutation.mutate(
            {
                question: messageContent,
                personalityType: personalityType || 'chatbot'
            },
            {
                onSuccess: (data) => {
                    console.log('✅ Hunter AI API Success:', data);

                    // Parse Hunter AI response
                    let botContent = '';
                    if (data.success && data.answer) {
                        botContent = data.answer;
                    } else if (data.response) {
                        botContent = data.response;
                    } else if (data.success === false && data.error) {
                        botContent = `❌ Error: ${data.error}`;
                    } else {
                        console.warn('⚠️ Unexpected response format:', data);
                        botContent = `❌ Unexpected response format. Please try again.`;
                    }

                    const botMessage: Message = {
                        id: Date.now() + 1,
                        chatSessionId: 0,
                        content: botContent,
                        isUser: false,
                        createdAt: new Date(),
                    };

                    console.log('🤖 Adding Hunter AI response:', botMessage);
                    setMessages(prev => [...prev, botMessage]);
                },
                onError: (error: any) => {
                    console.error('❌ Hunter AI API Error:', error);

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

    // 🆕 START NEW HUNTER AI CONVERSATION
    const handleNewChat = () => {
        console.log('🆕 Starting new Hunter AI conversation');
        setMessages([]);
        setMessageInput("");

        // Add welcome message
        const welcomeMessage: Message = {
            id: Date.now(),
            chatSessionId: 0,
            content: "Hi! I'm Hunter AI, your personal advisor for Hunter College. I can help you with majors, programs, requirements, and more. What would you like to know?",
            isUser: false,
            createdAt: new Date(),
        };
        setMessages([welcomeMessage]);
    };

    // 🔄 Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 📏 Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [messageInput]);

    // 🔄 Check Hunter AI status on component mount
    useEffect(() => {
        console.log('🚀 Initializing Hunter AI chat system...');
        checkChatbotStatus();

        // Start with welcome message
        handleNewChat();
    }, []);

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

    const isLoading = sendHunterAIMutation.isPending;

    return {
        // 📱 STATE
        messageInput,
        messages,
        chatbotStatus,
        isLoading,

        // 🎯 REFS
        textareaRef,
        messagesEndRef,

        // ✏️ SETTERS
        setMessageInput,

        // 🚀 ACTIONS
        handleSendMessage,
        handleNewChat,
        checkChatbotStatus,
        getStatusBadge,

        // 🎯 HUNTER AI ONLY - No regular chat functionality
        currentSessionId: null, // Not used
        chatSessions: [], // Not used
        handleChatSelect: () => { }, // Not used
        handleLoadMoreSessions: () => { }, // Not used
        hasMoreSessions: false, // Not used
        isLoadingMoreSessions: false, // Not used
        isLoadingSessions: false, // Not used

        // 🤖 HUNTER AI SPECIFIC
        isUsingChatbot: true, // Always true
        selectedPersonalityType: 'chatbot' // Always chatbot
    };
};