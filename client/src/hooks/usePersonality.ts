// src/hooks/usePersonality.ts
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PersonalityType } from '@shared/schema';
import type { PersonalityGroup } from '@/lib/personalityData';

export const usePersonality = () => {
    const [selectedPersonalityType, setSelectedPersonalityType] = useState<string>("");
    const [selectedPersonalityGroup, setSelectedPersonalityGroup] = useState<PersonalityGroup | null>(null);

    // Fetch personality types (keeping original for compatibility)
    const { data: personalityTypes } = useQuery<PersonalityType[]>({
        queryKey: ["/api/personality-types"],
    });

    // Handle personality group selection
    const handlePersonalityGroupSelect = (
        group: PersonalityGroup,
        setShowChatbotSuggestions: (show: boolean) => void
    ) => {
        setSelectedPersonalityGroup(group);
        setShowChatbotSuggestions(false);
    };

    // Handle personality type selection
    const handlePersonalityTypeSelect = (
        type: string,
        setIsUsingChatbot: (using: boolean) => void,
        setShowChatbotSuggestions: (show: boolean) => void,
        createSessionMutation: any
    ) => {
        setSelectedPersonalityType(type.toLowerCase());
        setIsUsingChatbot(false); // Use original system for personality-based chat
        setShowChatbotSuggestions(false);
        createSessionMutation.mutate(type.toLowerCase());
    };

    // Handle back to groups
    const handleBackToGroups = (
        setShowChatbotSuggestions: (show: boolean) => void
    ) => {
        setSelectedPersonalityGroup(null);
        setShowChatbotSuggestions(false);
    };

    // Handle unknown personality type
    const handleUnknownPersonalityType = (
        setIsUsingChatbot: (using: boolean) => void,
        setShowChatbotSuggestions: (show: boolean) => void,
        createSessionMutation: any
    ) => {
        setSelectedPersonalityType("unknown");
        setIsUsingChatbot(false);
        setShowChatbotSuggestions(false);
        createSessionMutation.mutate("unknown");
    };
    const resetPersonalityState = () => {
        setSelectedPersonalityType("");
        setSelectedPersonalityGroup(null);
        // Add any other personality-related state resets here
    };


    // Handle send message with pending logic
    const handleSendMessageWithPending = (
        messageInput: string,
        currentSessionId: number | null,
        isUsingChatbot: boolean,
        setPendingMessage: (message: string) => void,
        createSessionMutation: any,
        sendMessageMutation: any
    ) => {
        if (!messageInput.trim()) return;

        console.log('handleSendMessage:', { isUsingChatbot, currentSessionId });

        // Skip if in chatbot mode (handled by useChatbot)
        if (isUsingChatbot) return;

        console.log('Sending to personality system');

        if (!currentSessionId || currentSessionId <= 0) {
            console.log('Creating personality session first');
            setPendingMessage(messageInput.trim());
            createSessionMutation.mutate(selectedPersonalityType || "unknown");
            return;
        }

        sendMessageMutation.mutate(messageInput.trim());
    };

    return {
        // State
        selectedPersonalityType,
        selectedPersonalityGroup,

        // Data
        personalityTypes,

        // Setters
        setSelectedPersonalityType,
        setSelectedPersonalityGroup,

        // Actions
        handlePersonalityGroupSelect,
        handlePersonalityTypeSelect,
        handleBackToGroups,
        handleUnknownPersonalityType,
        handleSendMessageWithPending,
        // ... other returns
        resetPersonalityState,

    };
};