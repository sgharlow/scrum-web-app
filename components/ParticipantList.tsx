import React from 'react';
import type { Participant } from '../types';
import { useCollaborationContext } from '../App';
import { CrownIcon, CheckCircleIcon, LinkIcon, UnlinkIcon, PlusIcon } from './Icons';

interface ParticipantCardProps {
  participant: Participant;
  isFacilitator: boolean;
  hasVoted: boolean;
  areVotesRevealed: boolean;
  voteValue: any;
  isViewerFacilitator: boolean;
  onPromote: (participantId: string) => void;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({ participant, isFacilitator, hasVoted, areVotesRevealed, voteValue, isViewerFacilitator, onPromote }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg group">
      <div className="flex items-center gap-3">
        <img
          src={participant.avatar}
          alt={participant.name}
          className={`w-10 h-10 rounded-full ${isFacilitator ? 'ring-2 ring-offset-2 ring-yellow-400 dark:ring-offset-slate-700' : 'border-2 border-slate-300 dark:border-slate-600'}`}
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">{participant.name}</span>
            {isViewerFacilitator && !isFacilitator && (
              <button 
                  onClick={() => onPromote(participant.id)} 
                  className="p-1 text-slate-400 hover:text-yellow-500 transition-colors opacity-0 group-hover:opacity-100"
                  title={`Make ${participant.name} Facilitator`}
                  aria-label={`Make ${participant.name} Facilitator`}
              >
                  <CrownIcon className="w-4 h-4" />
              </button>
            )}
          </div>
            {isFacilitator && (
                <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                    <CrownIcon className="w-4 h-4" />
                    <span>Facilitator</span>
                </div>
            )}
        </div>
      </div>
      <div className="w-12 h-10 perspective">
         <div className={`w-full h-full flipper-container ${areVotesRevealed ? 'flipped' : ''}`}>
            {/* Front of card */}
            <div className="flipper-face flipper-front rounded-md bg-slate-200 dark:bg-slate-600">
                {hasVoted ? (
                    <CheckCircleIcon className="w-7 h-7 text-green-500" />
                ) : (
                    <div className="w-3 h-3 bg-slate-400 rounded-full animate-pulse"></div>
                )}
            </div>
            {/* Back of card */}
            <div className="flipper-face flipper-back bg-sky-500 text-white font-bold rounded-md text-lg shadow-inner">
                {voteValue ?? '-'}
            </div>
         </div>
      </div>
    </div>
  );
};

export default function ParticipantList() {
    const { state, dispatch, currentUser } = useCollaborationContext();
    const { participants, votes, areVotesRevealed, facilitatorId } = state;
    const isCurrentUserFacilitator = currentUser.id === facilitatorId;

    const handlePromote = (participantId: string) => {
        const newFacilitatorName = participants.find(p => p.id === participantId)?.name || 'this person';
        if (window.confirm(`Are you sure you want to make ${newFacilitatorName} the new facilitator? You will lose facilitator controls.`)) {
            dispatch({ type: 'SET_FACILITATOR', payload: participantId });
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                Team ({participants.length})
            </h2>
            <div className="space-y-3 flex-grow overflow-y-auto pr-2">
                {participants.map(p => (
                    <ParticipantCard
                        key={p.id}
                        participant={p}
                        voteValue={votes[p.id]}
                        isFacilitator={p.id === facilitatorId}
                        hasVoted={!!votes[p.id]}
                        areVotesRevealed={areVotesRevealed}
                        isViewerFacilitator={isCurrentUserFacilitator}
                        onPromote={handlePromote}
                    />
                ))}
            </div>
        </div>
    );
}