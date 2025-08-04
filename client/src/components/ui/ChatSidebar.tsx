// client/src/components/ui/ChatSidebar.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, CheckCircle, MessageSquare, Clock, MoreHorizontal } from "lucide-react";
import type { ChatSession } from '@shared/schema';

interface ChatSidebarProps {
    onNewChat: () => void;
    onChatSelect: (chatId: number) => void;
    currentSessionId: number | null;
    chatbotStatus: {
        status: 'online' | 'offline' | 'checking';
        message: string;
    };
    chatSessions: ChatSession[];
    onLoadMoreSessions?: () => void;
    hasMoreSessions?: boolean;
    isLoadingMoreSessions?: boolean;
    isLoadingSessions?: boolean;
}

export function ChatSidebar({
    onNewChat,
    onChatSelect,
    currentSessionId,
    chatbotStatus,
    chatSessions,
    onLoadMoreSessions,
    hasMoreSessions = false,
    isLoadingMoreSessions = false,
    isLoadingSessions = false
}: ChatSidebarProps) {

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
        return session.title || "New Chat";
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

                {isLoadingSessions ? (
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
                            </button>
                        ))}

                        {hasMoreSessions && (
                            <button
                                onClick={onLoadMoreSessions}
                                disabled={isLoadingMoreSessions}
                                className="w-full p-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 text-sm flex items-center justify-center gap-2 border border-white/20"
                            >
                                {isLoadingMoreSessions ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white/70"></div>
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <MoreHorizontal className="w-4 h-4" />
                                        Load More Chats
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}