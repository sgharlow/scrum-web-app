import React from 'react';
import type { VoteValue } from '../types';
import { CoffeeIcon, QuestionIcon } from './Icons';
import { useCollaborationContext } from '../App';
import { VOTING_SCALE } from '../constants';

const VoteCard: React.FC<{
  value: VoteValue;
  onVote: (value: VoteValue) => void;
  disabled: boolean;
}> = ({ value, onVote, disabled }) => {
  const isSpecialCard = typeof value !== 'number';
  
  return (
    <button
      onClick={() => onVote(value)}
      disabled={disabled}
      className={`
        w-20 h-28 sm:w-24 sm:h-32 
        flex flex-col items-center justify-center 
        rounded-lg border-2 
        shadow-lg transform transition-all duration-200
        ${isSpecialCard ? 'bg-amber-100 dark:bg-amber-800 border-amber-300 dark:border-amber-600' : 'bg-sky-100 dark:bg-sky-800 border-sky-300 dark:border-sky-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:-translate-y-2 hover:shadow-2xl'}
      `}
    >
      <span className="text-3xl sm:text-4xl font-bold text-slate-700 dark:text-slate-200">
        {value === '☕' ? <CoffeeIcon className="w-10 h-10"/> : value === '❓' ? <QuestionIcon className="w-10 h-10"/> : value}
      </span>
    </button>
  );
};

export default function VotingArea() {
    const { state, dispatch, currentUser } = useCollaborationContext();
    const { areVotesRevealed, isVotingActive, votes, participants, facilitatorId, stories, currentStoryId } = state;
    const isFacilitator = currentUser.id === facilitatorId;
    const userHasVoted = !!votes[currentUser.id];
    const votesCount = Object.keys(votes).length;
    const participantsCount = participants.length;
    
    const handleVote = (value: VoteValue) => {
        if (userHasVoted || areVotesRevealed || !isVotingActive) return;
        dispatch({ type: 'CAST_VOTE', payload: { participantId: currentUser.id, value }});
    };
    
    const handleRevealVotes = () => {
        if (!currentStoryId) return;
        dispatch({ type: 'REVEAL_VOTES' });
        
        const numericVotes = Object.values(votes).filter((v): v is number => typeof v === 'number');
        if (numericVotes.length > 0) {
            const median = numericVotes.sort((a,b) => a-b)[Math.floor(numericVotes.length / 2)];
            dispatch({ type: 'SET_ESTIMATE', payload: { storyId: currentStoryId, estimate: median } });
        }
    };
    
    const handleNextRound = () => {
        const currentIndex = stories.findIndex(s => s.id === currentStoryId);
        const nextStory = stories.find((s, i) => i > currentIndex && !s.estimate);
        dispatch({ type: 'SET_CURRENT_STORY', payload: nextStory?.id ?? null });
    };
    
    const handleResetRound = () => dispatch({ type: 'RESET_VOTING' });

    const votingPrompt = areVotesRevealed 
        ? "Voting has ended." 
        : !isVotingActive
        ? "Waiting for facilitator to start the vote."
        : userHasVoted 
        ? "Waiting for others..." 
        : "Cast your vote!";

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4">{votingPrompt}</h2>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
                {VOTING_SCALE.map(value => (
                    <VoteCard
                        key={String(value)}
                        value={value}
                        onVote={handleVote}
                        disabled={userHasVoted || areVotesRevealed || !isVotingActive}
                    />
                ))}
            </div>
            
            {isFacilitator && isVotingActive && (
                <div className="flex space-x-4">
                    {areVotesRevealed ? (
                        <button onClick={handleNextRound} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors text-lg">Next Story</button>
                    ) : (
                        <button onClick={handleRevealVotes} disabled={votesCount === 0} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors text-lg">Reveal Votes ({votesCount}/{participantsCount})</button>
                    )}
                    <button onClick={handleResetRound} className="px-8 py-3 bg-slate-500 text-white font-bold rounded-lg shadow-md hover:bg-slate-600 transition-colors text-lg">Reset</button>
                </div>
            )}
        </div>
    );
}
