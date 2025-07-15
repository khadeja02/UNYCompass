// src/lib/personalityData.ts

export type PersonalityGroup = 'analysts' | 'diplomats' | 'sentinels' | 'explorers';

export interface PersonalityType {
    code: string;
    name: string;
    description: string;
}

export interface PersonalityGroupData {
    name: string;
    description: string;
    types: PersonalityType[];
}

export const personalityGroups: Record<PersonalityGroup, PersonalityGroupData> = {
    analysts: {
        name: 'Analysts',
        description: 'Rational and impartial, they excel at intellectual debates and scientific pursuits.',
        types: [
            { code: 'INTJ', name: 'Architect', description: 'Imaginative and strategic thinkers, with a plan for everything.' },
            { code: 'INTP', name: 'Thinker', description: 'Innovative inventors with an unquenchable thirst for knowledge.' },
            { code: 'ENTJ', name: 'Commander', description: 'Bold, imaginative and strong-willed leaders.' },
            { code: 'ENTP', name: 'Debater', description: 'Smart and curious thinkers who cannot resist an intellectual challenge.' }
        ]
    },
    diplomats: {
        name: 'Diplomats',
        description: 'Cooperative and imaginative, they tend to see the best in other people.',
        types: [
            { code: 'INFJ', name: 'Advocate', description: 'Creative and insightful, inspired and independent.' },
            { code: 'INFP', name: 'Mediator', description: 'Poetic, kind and altruistic, always eager to help good causes.' },
            { code: 'ENFJ', name: 'Protagonist', description: 'Charismatic and inspiring leaders, able to mesmerize listeners.' },
            { code: 'ENFP', name: 'Campaigner', description: 'Enthusiastic, creative and sociable free spirits.' }
        ]
    },
    sentinels: {
        name: 'Sentinels',
        description: 'Cooperative and highly practical, they enjoy creating order, security and stability.',
        types: [
            { code: 'ISTJ', name: 'Logistician', description: 'Practical and fact-minded, reliable and responsible.' },
            { code: 'ISFJ', name: 'Protector', description: 'Warm-hearted and dedicated, always ready to protect loved ones.' },
            { code: 'ESTJ', name: 'Executive', description: 'Excellent administrators, unsurpassed at managing things or people.' },
            { code: 'ESFJ', name: 'Consul', description: 'Extraordinarily caring, social and popular people, always eager to help.' }
        ]
    },
    explorers: {
        name: 'Explorers',
        description: 'Spontaneous, ingenious and flexible, they prefer to keep their options open.',
        types: [
            { code: 'ISTP', name: 'Virtuoso', description: 'Bold and practical experimenters, masters of all kinds of tools.' },
            { code: 'ISFP', name: 'Adventurer', description: 'Flexible and charming artists, always ready to explore new possibilities.' },
            { code: 'ESTP', name: 'Entrepreneur', description: 'Smart, energetic and perceptive, truly enjoy living on the edge.' },
            { code: 'ESFP', name: 'Entertainer', description: 'Spontaneous, energetic and enthusiastic people - life is never boring.' }
        ]
    }
};

// Sample suggestions for Hunter College
export const suggestions = [
    "What computer science programs does Hunter offer?",
    "Tell me about psychology majors at Hunter",
    "What are the admission requirements?",
    "How do I apply to Hunter College?",
    "What financial aid is available?"
];