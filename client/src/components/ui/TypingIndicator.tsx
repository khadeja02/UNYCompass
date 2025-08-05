import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
    className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ className }) => {
    return (
        <div className={`flex items-start gap-3 p-4 ${className}`}>
            <Avatar className="w-8 h-8 bg-blue-600">
                <AvatarFallback>
                    <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
            </Avatar>

            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 max-w-xs">
                <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                </div>
            </div>
        </div>
    );
};