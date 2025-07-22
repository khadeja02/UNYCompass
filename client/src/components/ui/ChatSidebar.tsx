// client/src/components/ui/ChatSidebar.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, CheckCircle, MessageSquare, Clock } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ChatSession } from '@shared/schema';

interface ChatSidebarProps {
    onNewChat: () => void;
    onChatSelect: (chatId: number) => void;
    currentSessionId: number | null;
    chatbotStatus: {
        status: 'online' | 'offline' | 'checking';
        message: string;
    };
}

export function ChatSidebar({ onNewChat, onChatSelect, currentSessionId, chatbotStatus }: ChatSidebarProps) {
    // Fetch user's chat sessions
    const { data: chatSessions = [], isLoading } = useQuery<ChatSession[]>({
        queryKey: ["/api/chat-sessions"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/chat-sessions");
            return response.json();
        },
    });

    const getStatusBadge = () => {
        switch (chatbotStatus.status) {
            case 'online':
                return { variant: 'secondary' as const, className: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Hunter AI Online' };
            case 'offline':
                return { variant: 'secondary' as const, className: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Hunter AI Offline' };
            default:
                return { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, text: 'Connecting...' };
        }
    };

    const badgeData = getStatusBadge();
    const IconComponent = badgeData.icon;

    const formatChatTitle = (session: ChatSession) => {
        // Use title if available, otherwise generate from personality type
        if (session.title) {
            return session.title;
        }
        if (session.personalityType) {
            return `${session.personalityType} Chat`;
        }
        return "New Chat";
    };

    const formatChatDate = (date: Date | string | null) => {
        if (!date) return '';
        const chatDate = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - chatDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        return chatDate.toLocaleDateString();
    };

    return (
        <div className="w-64 bg-gradient-to-b from-purple-700 to-purple-900 dark:from-purple-800 dark:to-purple-950 flex flex-col h-full">
            <div className="p-6">
                <Button
                    onClick={onNewChat}
                    className="w-full bg-black bg-opacity-20 hover:bg-opacity-30 text-white border-0 mb-4"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                </Button>

                <div className="mb-4">
                    <Badge variant={badgeData.variant} className={badgeData.className}>
                        <IconComponent className="w-3 h-3 mr-1" />
                        {badgeData.text}
                    </Badge>
                </div>
            </div>

            <div className="flex-1 px-6 overflow-y-auto">
                <h3 className="text-white/70 text-sm font-medium mb-3 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Recent Chats
                </h3>

                {isLoading ? (
                    <div className="text-white/50 text-sm">Loading chats...</div>
                ) : chatSessions.length === 0 ? (
                    <div className="text-white/50 text-sm">No previous chats</div>
                ) : (
                    <div className="space-y-2">
                        {chatSessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => onChatSelect(session.id)}
                                className={`
                                    w-full text-left p-3 rounded-lg transition-all duration-200
                                    ${currentSessionId === session.id
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }
                                `}
                            >
                                <div className="font-medium text-sm truncate mb-1">
                                    {formatChatTitle(session)}
                                </div>

                                <div className="flex items-center text-xs text-white/60">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatChatDate(session.updatedAt)}
                                </div>

                                {session.personalityType && (
                                    <div className="text-xs text-purple-200 mt-1">
                                        {session.personalityType}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}