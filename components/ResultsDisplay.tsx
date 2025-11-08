import React from 'react';
import type { VoteValue } from '../types';
import { useCollaborationContext } from '../App';

export default function ResultsDisplay() {
  const { state } = useCollaborationContext();
  const { votes, participants, areVotesRevealed } = state;

  if (!areVotesRevealed) return null;

  const voteCounts = Object.values(votes).reduce((acc, vote) => {
    const key = String(vote);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedVotes = Object.entries(voteCounts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
        const valA = parseFloat(a.value);
        const valB = parseFloat(b.value);
        if (!isNaN(valA) && !isNaN(valB)) return valA - valB;
        return a.value.localeCompare(b.value);
    });

  const numericVotes = Object.values(votes).filter((v): v is number => typeof v === 'number');
  const minVote = numericVotes.length > 0 ? Math.min(...numericVotes) : null;
  const maxVote = numericVotes.length > 0 ? Math.max(...numericVotes) : null;
  const maxCount = Math.max(...Object.values(voteCounts), 0);
  
  const specialVotes = Object.entries(votes)
    .filter(([, value]) => typeof value !== 'number')
    .map(([participantId, value]) => ({
      participantName: participants.find(p => p.id === participantId)?.name || 'Someone',
      value
    }));

  const getBarColor = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'bg-amber-400 dark:bg-amber-500';
    if (numValue === minVote || numValue === maxVote) {
        if (new Set(numericVotes).size > 1) return 'bg-red-500 dark:bg-red-600';
    }
    return 'bg-sky-500 dark:bg-sky-600';
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 animate-reveal">
      <h2 className="text-xl font-bold mb-6 text-center">Voting Results</h2>
      
      {sortedVotes.length > 0 ? (
        <div className="flex justify-center items-end gap-4 h-40">
            {sortedVotes.map(({ value, count }) => (
                <div key={value} className="flex flex-col items-center h-full justify-end" title={`${count} vote(s)`}>
                    <div
                        className={`w-12 rounded-t-md transition-all duration-500 ${getBarColor(value)}`}
                        style={{ height: `${(count / maxCount) * 100}%` }}
                    >
                        <span className="relative -top-6 text-white font-bold text-sm">{count}</span>
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-700 dark:text-slate-200">{value}</div>
                </div>
            ))}
        </div>
      ) : (
        <p className="text-center text-slate-500">No votes have been cast.</p>
      )}

      {specialVotes.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-md font-semibold text-center text-slate-600 dark:text-slate-300">Special Cards Played</h3>
            <ul className="mt-2 text-center text-slate-500 dark:text-slate-400 text-sm">
                {specialVotes.map((vote, i) => (
                    <li key={i}>
                        <span className="font-semibold">{vote.participantName}</span> used a '{vote.value}' card.
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
}
