import type { AppState, Action, RetroColumnId } from './types';
import { ICEBREAKER_QUESTIONS } from './constants';

export const initialState: Omit<AppState, 'roomCode' | 'facilitatorId' | 'participants' | 'icebreaker'> = {
  mode: 'planning',
  stories: [],
  currentStoryId: null,
  votes: {},
  areVotesRevealed: false,
  isVotingActive: false,
  showIndividualVotes: false,
  retroColumns: [
    { id: 'well', title: 'What went well?', cards: [] },
    { id: 'improve', title: 'What could be improved?', cards: [] },
    { id: 'actions', title: 'Action Items', cards: [] },
  ],
  timer: {
    startTime: null,
    duration: 0,
    isRunning: false,
  },
};

export const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'SET_MODE':
      return { ...state, mode: action.payload, isVotingActive: false, showIndividualVotes: false };
    case 'ADD_PARTICIPANT':
        if (state.participants.some(p => p.id === action.payload.id)) {
            return state; // Already exists
        }
        return { ...state, participants: [...state.participants, action.payload] };
    case 'REMOVE_PARTICIPANT':
        return { ...state, participants: state.participants.filter(p => p.id !== action.payload) };
    case 'ADD_STORY':
      return { ...state, stories: [...state.stories, action.payload], currentStoryId: state.currentStoryId ?? action.payload.id };
    case 'UPDATE_STORY':
      return {...state, stories: state.stories.map(s => s.id === action.payload.id ? {...s, title: action.payload.title} : s)};
    case 'DELETE_STORY':
        const newStories = state.stories.filter(s => s.id !== action.payload);
        const newCurrentStoryId = state.currentStoryId === action.payload
            ? newStories.find(s => !s.estimate)?.id ?? null
            : state.currentStoryId;
        return { ...state, stories: newStories, currentStoryId: newCurrentStoryId };
    case 'SET_CURRENT_STORY':
      return { ...state, currentStoryId: action.payload, votes: {}, areVotesRevealed: false, isVotingActive: false, showIndividualVotes: false };
    case 'CAST_VOTE':
      return { ...state, votes: { ...state.votes, [action.payload.participantId]: action.payload.value } };
    case 'SET_VOTES':
        return { ...state, votes: action.payload };
    case 'REVEAL_VOTES':
      return { ...state, areVotesRevealed: true };
    case 'RESET_VOTING':
      return { ...state, areVotesRevealed: false, votes: {}, isVotingActive: false, showIndividualVotes: false };
    case 'START_VOTING':
        return { ...state, isVotingActive: true, areVotesRevealed: false, votes: {}, showIndividualVotes: false };
    case 'TOGGLE_SHOW_INDIVIDUAL_VOTES':
      return { ...state, showIndividualVotes: !state.showIndividualVotes };
    case 'SET_ESTIMATE':
      return {...state, stories: state.stories.map(s => s.id === action.payload.storyId ? {...s, estimate: action.payload.estimate} : s)};
    case 'ADD_RETRO_CARD':
      // Ensure we don't add a duplicate card ID
      const column = state.retroColumns.find(c => c.id === action.payload.columnId);
      if (column && column.cards.some(c => c.id === action.payload.card.id)) {
        return state;
      }
      return {
        ...state,
        retroColumns: state.retroColumns.map(col =>
          col.id === action.payload.columnId ? { ...col, cards: [...col.cards, action.payload.card] } : col
        ),
      };
    case 'VOTE_RETRO_CARD':
      return {
        ...state,
        retroColumns: state.retroColumns.map(col =>
          col.id === action.payload.columnId
            ? { ...col, cards: col.cards.map(c => c.id === action.payload.cardId ? { ...c, votes: c.votes + 1 } : c) }
            : col
        ),
      };
    case 'DELETE_RETRO_CARD':
      return {
        ...state,
        retroColumns: state.retroColumns.map(col =>
          col.id === action.payload.columnId ? { ...col, cards: col.cards.filter(c => c.id !== action.payload.cardId) } : col
        ),
      };
    case 'SORT_RETRO_COLUMN':
        return {
            ...state,
            retroColumns: state.retroColumns.map(col => 
                col.id === action.payload
                    ? { ...col, cards: [...col.cards].sort((a,b) => b.votes - a.votes) }
                    : col
            )
        };
    case 'MOVE_RETRO_CARD': {
        const { sourceColumnId, destColumnId, cardId, insertAtIndex } = action.payload;
        let cardToMove;
        const sourceCol = state.retroColumns.find(c => c.id === sourceColumnId);
        if (sourceCol) {
            cardToMove = sourceCol.cards.find(c => c.id === cardId);
        }

        if (!cardToMove) return state;

        let newColumns = state.retroColumns.map(col => {
            if (col.id === sourceColumnId) {
                return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
            }
            return col;
        });
        
        const destColIndex = newColumns.findIndex(c => c.id === destColumnId);
        if (destColIndex !== -1) {
            newColumns[destColIndex].cards.splice(insertAtIndex, 0, cardToMove);
        }

        return { ...state, retroColumns: newColumns };
    }
    case 'SET_ICEBREAKER':
      return { ...state, icebreaker: action.payload };
    case 'SET_FACILITATOR':
      return { ...state, facilitatorId: action.payload };
    
    // --- TIMER ACTIONS ---
    case 'START_TIMER':
      return { ...state, timer: { isRunning: true, duration: action.payload.duration, startTime: Date.now() }};
    case 'TOGGLE_PAUSE_TIMER': {
      if (state.timer.isRunning) {
        const elapsed = (Date.now() - state.timer.startTime!) / 1000;
        const remaining = Math.max(0, state.timer.duration - elapsed);
        return { ...state, timer: { ...state.timer, isRunning: false, startTime: null, duration: remaining }};
      } else {
        return { ...state, timer: { ...state.timer, isRunning: true, startTime: Date.now() }};
      }
    }
    case 'RESET_TIMER':
      return { ...state, timer: { isRunning: false, startTime: null, duration: 0 }};

    default:
      return state;
  }
};