// client/src/components/ui/PersonalitySelector.tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Compass, Bot, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { personalityGroups, suggestions, type PersonalityGroup } from "@/lib/personalityData";

interface PersonalitySelectorProps {
    selectedPersonalityGroup: PersonalityGroup | null;
    setSelectedPersonalityGroup: (group: PersonalityGroup | null) => void;
    onPersonalitySelect: (code: string) => void;
    onUnknownPersonality: () => void;
    onSuggestionClick: (suggestion: string) => void;
    chatbotStatus: {
        status: 'online' | 'offline' | 'checking';
        message: string;
    };
}

export function PersonalitySelector({
    selectedPersonalityGroup,
    setSelectedPersonalityGroup,
    onPersonalitySelect,
    onUnknownPersonality,
    onSuggestionClick,
    chatbotStatus
}: PersonalitySelectorProps) {
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
        <div className="flex-1 flex flex-col overflow-y-auto p-6">
            <div className="flex flex-col items-center max-w-4xl mx-auto w-full">
                {/* Logo */}
                <div className="mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border-4 border-purple-600 flex items-center justify-center">
                            <Compass className="text-purple-600 w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-purple-600">UNY COMPASS</h1>
                        </div>
                    </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-center max-w-md mb-6">
                    Ask Hunter AI about programs, admissions, or get personalized major recommendations based on your personality
                </p>

                {/* Quick Start Options */}
                <div className="w-full max-w-3xl">
                    <h3 className="text-gray-700 dark:text-gray-300 text-center mb-4">Choose your approach:</h3>

                    <div className="grid grid-cols-1 gap-3 mb-4">
                        {/* Hunter AI Advisor Card - Display Only */}
                        <Card className="p-4 border-2 border-purple-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Hunter AI Advisor
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Ask directly using the message box below, or use the quick options
                                    </p>
                                    <div className="mt-2">
                                        <Badge variant={badgeData.variant} className={badgeData.className}>
                                            <IconComponent className="w-3 h-3 mr-1" />
                                            {badgeData.text}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Personality-Based Recommendations */}
                        <Card className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <Compass className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Get Major Recommendations by Personality
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Let Hunter AI suggest majors based on your personality type
                                    </p>
                                </div>
                            </div>

                            {!selectedPersonalityGroup ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(personalityGroups).map(([key, group]) => (
                                        <Button
                                            key={key}
                                            variant="outline"
                                            className="p-3 h-auto text-left justify-start"
                                            onClick={() => setSelectedPersonalityGroup(key as PersonalityGroup)}
                                        >
                                            <div>
                                                <div className="font-medium text-sm">{group.name}</div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    {group.types.map(type => type.code).join(', ')}
                                                </div>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedPersonalityGroup(null)}>
                                            <ArrowLeft className="w-4 h-4" />
                                        </Button>
                                        <h5 className="font-medium">{personalityGroups[selectedPersonalityGroup].name}</h5>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {personalityGroups[selectedPersonalityGroup].types.map((type) => (
                                            <Button
                                                key={type.code}
                                                variant="outline"
                                                className="p-3 h-auto text-left justify-start"
                                                onClick={() => onPersonalitySelect(type.code)}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{type.name}</div>
                                                    <div className="text-xs text-gray-600">{type.code}</div>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="text-center mt-3">
                                <Button variant="link" onClick={onUnknownPersonality}>
                                    I don't know my personality type
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Quick Suggestions */}
                    <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-3">Or ask about:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {suggestions.map((suggestion, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onSuggestionClick(suggestion)}
                                    className="text-xs"
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}