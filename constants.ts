import type { Participant, Story, VoteValue } from './types';

export const VOTING_SCALE: VoteValue[] = [1, 2, 3, 5, 8, 13, 21, '❓', '☕'];

export const INITIAL_STORIES: Story[] = [];

export const AVATAR_OPTIONS: string[] = [
    'https://api.dicebear.com/8.x/bottts/svg?seed=Casper',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Charlie',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Bandit',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Loki',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Misty',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Cookie',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Buddy',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Coco',
    'https://api.dicebear.com/8.x/micah/svg?seed=Garfield',
    'https://api.dicebear.com/8.x/micah/svg?seed=Max',
    'https://api.dicebear.com/8.x/micah/svg?seed=Abby',
    'https://api.dicebear.com/8.x/micah/svg?seed=Snowball',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Midnight',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Aneka',
    'https://api.dicebear.com/8.x/adventurer/svg?seed=Fluffy',
    'https://api.dicebear.com/8.x/pixel-art/svg?seed=Felix',
    'https://api.dicebear.com/8.x/pixel-art/svg?seed=Sheba',
    'https://api.dicebear.com/8.x/fun-emoji/svg?seed=Sammy',
    'https://api.dicebear.com/8.x/big-smile/svg?seed=Tigger',
    'https://api.dicebear.com/8.x/bottts/svg?seed=Gizmo',
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