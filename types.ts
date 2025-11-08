export interface Participant {
  id: string;
  name: string;
  avatar: string;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  estimate?: VoteValue;
}

export type VoteValue = number | '☕' | '❓';

export interface Vote {
  participantId: string;
  value: VoteValue;
}

export type RoomMode = 'planning' | 'retro';

export interface RetroCard {
  id: string;
  text: string;
  authorId: string;
  votes: number;
}

export type RetroColumnId = 'well' | 'improve' | 'actions';

export interface RetroColumn {
  id: RetroColumnId;
  title: string;
  cards: RetroCard[];
}

// --- NEW TYPES FOR COLLABORATION ---

export interface AppState {
  roomCode: string;
  mode: RoomMode;
  participants: Participant[];
  facilitatorId: string;
  stories: Story[];
  currentStoryId: string | null;
  votes: Record<string, VoteValue>;
  areVotesRevealed: boolean;
  isVotingActive: boolean;
  retroColumns: RetroColumn[];
  icebreaker: string;
}

export type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'SET_MODE'; payload: RoomMode }
  | { type: 'ADD_PARTICIPANT'; payload: Participant }
  | { type: 'REMOVE_PARTICIPANT'; payload: string }
  | { type: 'ADD_STORY'; payload: Story }
  | { type: 'UPDATE_STORY'; payload: { id: string, title: string } }
  | { type: 'DELETE_STORY'; payload: string }
  | { type: 'SET_CURRENT_STORY'; payload: string | null }
  | { type: 'CAST_VOTE'; payload: { participantId: string; value: VoteValue } }
  | { type: 'SET_VOTES'; payload: Record<string, VoteValue> }
  | { type: 'REVEAL_VOTES' }
  | { type: 'RESET_VOTING' }
  | { type: 'START_VOTING' }
  | { type: 'SET_ESTIMATE'; payload: { storyId: string; estimate: VoteValue } }
  | { type: 'ADD_RETRO_CARD'; payload: { columnId: RetroColumnId; card: RetroCard } }
  | { type: 'VOTE_RETRO_CARD'; payload: { columnId: RetroColumnId; cardId: string } }
  | { type: 'DELETE_RETRO_CARD'; payload: { columnId: RetroColumnId; cardId: string } }
  | { type: 'SORT_RETRO_COLUMN'; payload: RetroColumnId }
  | { type: 'MOVE_RETRO_CARD'; payload: { sourceColumnId: RetroColumnId; destColumnId: RetroColumnId; cardId: string, insertAtIndex: number } }
  | { type: 'SET_ICEBREAKER'; payload: string };
