// client/src/components/ui/ChatSidebar.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, CheckCircle } from "lucide-react";

interface ChatSidebarProps {
    onNewChat: () => void;
    chatbotStatus: {
        status: 'online' | 'offline' | 'checking';
        message: string;
    };
}

export function ChatSidebar({ onNewChat, chatbotStatus }: ChatSidebarProps) {
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

            <div className="flex-1 px-6">
                {/* Chat history would go here */}
            </div>
        </div>
    );
}