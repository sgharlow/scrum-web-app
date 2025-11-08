import React from 'react';
import type { Participant } from '../types';
import { useCollaborationContext } from '../App';
import { CrownIcon, CheckCircleIcon, LinkIcon, UnlinkIcon, PlusIcon } from './Icons';

interface ParticipantListProps {
  // No props needed after removing invite button
}

const ParticipantCard: React.FC<{
  participant: Participant;
  isFacilitator: boolean;
  hasVoted: boolean;
  areVotesRevealed: boolean;
  voteValue: any;
}> = ({ participant, isFacilitator, hasVoted, areVotesRevealed, voteValue }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
      <div className="flex items-center gap-3">
        <img
          src={participant.avatar}
          alt={participant.name}
          className={`w-10 h-10 rounded-full ${isFacilitator ? 'ring-2 ring-offset-2 ring-yellow-400 dark:ring-offset-slate-700' : 'border-2 border-slate-300 dark:border-slate-600'}`}
        />
        <div className="flex flex-col">
            <span className="font-medium text-slate-700 dark:text-slate-300">{participant.name}</span>
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

export default function ParticipantList({}: ParticipantListProps) {
    const { state } = useCollaborationContext();
    const { participants, votes, areVotesRevealed, facilitatorId } = state;

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
                    />
                ))}
            </div>
        </div>
    );
}