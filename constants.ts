import type { Participant, Story, VoteValue } from './types';

export const VOTING_SCALE: VoteValue[] = [1, 2, 3, 5, 8, 13, 21, '❓', '☕'];

export const INITIAL_STORIES: Story[] = [];

export const AVATAR_OPTIONS: string[] = [
    'https://api.dicebear.com/8.x/bottts/svg?seed=bear',
    'https://api.dicebear.com/8.x/bottts/svg?seed=panda',
    'https://api.dicebear.com/8.x/bottts/svg?seed=frog',
    'https://api.dicebear.com/8.x/bottts/svg?seed=pig',
    'https://api.dicebear.com/8.x/bottts/svg?seed=koala',
    'https://api.dicebear.com/8.x/bottts/svg?seed=monkey',
    'https://api.dicebear.com/8.x/bottts/svg?seed=dog',
    'https://api.dicebear.com/8.x/bottts/svg?seed=cat',
    'https://api.dicebear.com/8.x/bottts/svg?seed=mouse',
    'https://api.dicebear.com/8.x/bottts/svg?seed=hamster',
    'https://api.dicebear.com/8.x/bottts/svg?seed=rabbit',
    'https://api.dicebear.com/8.x/bottts/svg?seed=fox',
    'https://api.dicebear.com/8.x/bottts/svg?seed=tiger',
    'https://api.dicebear.com/8.x/bottts/svg?seed=lion',
    'https://api.dicebear.com/8.x/bottts/svg?seed=cow',
    'https://api.dicebear.com/8.x/bottts/svg?seed=chicken',
    'https://api.dicebear.com/8.x/bottts/svg?seed=penguin',
    'https://api.dicebear.com/8.x/bottts/svg?seed=turtle',
    'https://api.dicebear.com/8.x/bottts/svg?seed=octopus',
    'https://api.dicebear.com/8.x/bottts/svg?seed=whale',
];

export const ICEBREAKER_QUESTIONS: string[] = [
    "What's the most useful thing you own?",
    "If you could have any superpower, what would it be and why?",
    "What's a small thing that made you smile this week?",
    "What's your favorite productivity hack?",
    "If you had to eat one meal for the rest of your life, what would it be?",
    "What's a skill you'd like to learn?",
    "What's the best thing you've watched or read recently?",
    "If you could travel anywhere in the world, where would you go first?",
];