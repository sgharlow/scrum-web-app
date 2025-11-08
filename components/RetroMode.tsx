import React, { useState } from 'react';
import type { Participant, RetroCard, RetroColumn, RetroColumnId } from '../types';
import { useCollaborationContext } from '../App';
import { PlusIcon, TrashIcon, HeartIcon, SortDescendingIcon, CrownIcon } from './Icons';

const RetroMode: React.FC<{ currentUser: Participant }> = ({ currentUser }) => {
    const { state, dispatch } = useCollaborationContext();
    const { retroColumns, participants, facilitatorId } = state;
    const [newCardText, setNewCardText] = useState<Record<RetroColumnId, string>>({ well: '', improve: '', actions: '' });
    const [draggedItem, setDraggedItem] = useState<{ card: RetroCard; sourceColumnId: RetroColumnId } | null>(null);
    const [dragOverColId, setDragOverColId] = useState<RetroColumnId | null>(null);

    const handleAddCard = (columnId: RetroColumnId) => {
        const text = newCardText[columnId].trim();
        if (!text) return;
        const newCard: RetroCard = { id: `card-${Date.now()}-${currentUser.id}`, text, authorId: currentUser.id, votes: 0 };
        dispatch({ type: 'ADD_RETRO_CARD', payload: { columnId, card: newCard } });
        setNewCardText(prev => ({ ...prev, [columnId]: '' }));
    };

    const handleVoteCard = (columnId: RetroColumnId, cardId: string) => dispatch({ type: 'VOTE_RETRO_CARD', payload: { columnId, cardId } });
    const handleDeleteCard = (columnId: RetroColumnId, cardId: string) => dispatch({ type: 'DELETE_RETRO_CARD', payload: { columnId, cardId } });
    const handleSortByVotes = (columnId: RetroColumnId) => dispatch({ type: 'SORT_RETRO_COLUMN', payload: columnId });

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, card: RetroCard, sourceColumnId: RetroColumnId) => {
        setDraggedItem({ card, sourceColumnId });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, columnId: RetroColumnId) => { e.preventDefault(); setDragOverColId(columnId); };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, destColumnId: RetroColumnId) => {
        e.preventDefault();
        if (!draggedItem) return;
        const { card: draggedCard, sourceColumnId } = draggedItem;

        const dropContainer = e.currentTarget;
        const cardElements = [...dropContainer.querySelectorAll('.retro-card')] as HTMLElement[];
        const dropTargetCard = cardElements.find(child => {
             if (child.id === draggedCard.id) return false;
             const rect = child.getBoundingClientRect();
             return e.clientY < rect.top + rect.height / 2;
        });
        const insertAtIndex = dropTargetCard ? cardElements.indexOf(dropTargetCard) : cardElements.length;

        dispatch({ type: 'MOVE_RETRO_CARD', payload: { sourceColumnId, destColumnId, cardId: draggedCard.id, insertAtIndex } });
        setDraggedItem(null);
        setDragOverColId(null);
    };
    
    const handleDragEnd = () => { setDraggedItem(null); setDragOverColId(null); };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full p-1">
            {retroColumns.map(col => (
                <div key={col.id} className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">{col.title}</h3>
                        <button onClick={() => handleSortByVotes(col.id)} className="text-slate-500 hover:text-sky-500 p-1 rounded-md" title="Sort by votes">
                            <SortDescendingIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div 
                        className={`space-y-3 flex-grow overflow-y-auto pr-2 rounded-lg transition-colors ${dragOverColId === col.id ? 'bg-sky-100/50 dark:bg-sky-900/20 border-2 border-dashed border-sky-400' : ''}`}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, col.id)}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        {col.cards.map(card => {
                            const author = participants.find(p => p.id === card.authorId);
                            return (
                                <div
                                    key={card.id}
                                    id={card.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, card, col.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`retro-card bg-white dark:bg-slate-700 p-2 rounded-md shadow animate-slide-in group cursor-grab active:cursor-grabbing flex items-start gap-2 ${draggedItem?.card.id === card.id ? 'opacity-40' : ''}`}>
                                    
                                    {author && (
                                        <img src={author.avatar} alt={author.name} title={`${author.name}${author.id === facilitatorId ? ' (Facilitator)' : ''}`} className={`w-6 h-6 rounded-full flex-shrink-0 mt-0.5 ${author.id === facilitatorId ? 'ring-2 ring-offset-1 ring-yellow-400 dark:ring-offset-slate-700' : ''}`} />
                                    )}
                                    <p className="flex-grow text-slate-800 dark:text-slate-200 break-words text-sm py-0.5">{card.text}</p>
                                    <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                                        <button onClick={() => handleVoteCard(col.id, card.id)} className="flex items-center gap-0.5 text-slate-500 hover:text-red-500 transition-colors">
                                            <HeartIcon className="w-4 h-4"/> 
                                            {card.votes > 0 && <span className="font-semibold text-xs leading-none">{card.votes}</span>}
                                        </button>
                                        {card.authorId === currentUser.id && (
                                            <button onClick={() => handleDeleteCard(col.id, card.id)} className="text-slate-400 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                         <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCardText[col.id]}
                                onChange={(e) => setNewCardText(prev => ({...prev, [col.id]: e.target.value}))}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddCard(col.id)}
                                placeholder="Add a card..."
                                className="flex-grow bg-slate-200 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <button onClick={() => handleAddCard(col.id)} className="p-2 bg-sky-600 text-white rounded-md hover:bg-sky-700"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RetroMode;
