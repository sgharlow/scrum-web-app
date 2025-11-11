import React, { useState, useMemo } from 'react';
import type { Story, Participant, VoteValue } from '../types';
import { VOTING_SCALE } from '../constants';
import VotingArea from './VotingArea';
import ResultsDisplay from './ResultsDisplay';
import { PencilIcon, TrashIcon, PlayIcon as StartVotingIcon, XMarkIcon } from './Icons';
import { useCollaborationContext } from '../App';

const StoryList: React.FC<{
    isFacilitator: boolean;
}> = ({ isFacilitator }) => {
    const { state, dispatch } = useCollaborationContext();
    const { stories, currentStoryId } = state;
    const [newStoryTitle, setNewStoryTitle] = useState('');
    const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
    
    const onSelectStory = (id: string) => {
        if (id === currentStoryId) return;
        dispatch({ type: 'SET_CURRENT_STORY', payload: id });
    };

    const onAddStory = (title: string) => {
        const newStory: Story = { id: `story-${Date.now()}`, title };
        dispatch({ type: 'ADD_STORY', payload: newStory });
    };
    
    const onDeleteStory = (id: string) => dispatch({ type: 'DELETE_STORY', payload: id });
    
    const onUpdateStory = (id: string, title: string) => dispatch({ type: 'UPDATE_STORY', payload: {id, title} });

    const handleAddStory = (e: React.FormEvent) => { e.preventDefault(); if(newStoryTitle.trim()) { onAddStory(newStoryTitle.trim()); setNewStoryTitle(''); } };
    const handleStartEdit = (story: Story) => { setEditingEstimateId(null); setEditingStoryId(story.id); setEditingTitle(story.title); };
    const handleCancelEdit = () => { setEditingStoryId(null); setEditingTitle(''); };
    const handleSaveEdit = () => { if (editingStoryId && editingTitle.trim()) { onUpdateStory(editingStoryId, editingTitle.trim()); } handleCancelEdit(); };
    const handleExport = () => {
        const csvRows = ["Title,Description,Estimate", ...stories.map(s => `"${s.title.replace(/"/g, '""')}",,"${s.estimate ?? ''}"`)];
        const link = document.createElement("a");
        link.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURI(csvRows.join("\n")));
        link.setAttribute("download", "story_estimates.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                <h2 className="text-xl font-bold">Stories</h2>
                <button onClick={handleExport} className="text-sm px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md font-semibold transition-colors">Export CSV</button>
            </div>
            <div className="flex-grow space-y-2 overflow-y-auto pr-2">
                {stories.map(story => (
                    <div key={story.id} onClick={() => editingStoryId !== story.id && onSelectStory(story.id)} className={`p-3 rounded-md transition-colors group ${story.id === currentStoryId && editingStoryId !== story.id ? 'bg-sky-100 dark:bg-sky-900 ring-2 ring-sky-500' : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700'} ${editingStoryId !== story.id ? 'cursor-pointer' : ''}`}>
                        {editingStoryId === story.id && isFacilitator ? (
                            <div className="flex gap-2"><input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onBlur={handleSaveEdit} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} autoFocus className="flex-grow bg-white dark:bg-slate-900 border border-sky-500 rounded-md px-2 py-1 focus:outline-none" /></div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-800 dark:text-slate-200 break-all">{story.title}</span>
                                <div className="flex items-center gap-2">
                                    {isFacilitator && (<div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"><button onClick={(e) => { e.stopPropagation(); handleStartEdit(story); }} className="text-slate-500 hover:text-sky-600"><PencilIcon className="w-4 h-4"/></button><button onClick={(e) => { e.stopPropagation(); onDeleteStory(story.id); }} className="text-slate-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button></div>)}
                                    {story.estimate != null && (
                                        isFacilitator && editingEstimateId === story.id ? (
                                            <div className="flex gap-1 items-center bg-slate-200 dark:bg-slate-600 p-1 rounded-full animate-slide-in">
                                                {VOTING_SCALE.map(value => (
                                                    <button
                                                        key={String(value)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            dispatch({ type: 'SET_ESTIMATE', payload: { storyId: story.id, estimate: value } });
                                                            setEditingEstimateId(null);
                                                        }}
                                                        className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-white dark:bg-slate-800 rounded-full hover:bg-sky-200 dark:hover:bg-sky-700"
                                                    >
                                                        {value === '☕' ? '☕' : value === '❓' ? '?' : value}
                                                    </button>
                                                ))}
                                                 <button onClick={(e) => { e.stopPropagation(); setEditingEstimateId(null); }} className="p-1 text-slate-500 hover:text-red-500" aria-label="Cancel edit"><XMarkIcon className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    if (isFacilitator) {
                                                        e.stopPropagation();
                                                        if(editingStoryId) handleSaveEdit();
                                                        setEditingEstimateId(story.id);
                                                    }
                                                }}
                                                className={`text-sm font-bold bg-sky-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 ml-2 ${isFacilitator ? 'cursor-pointer hover:bg-sky-600' : ''}`}
                                                title={isFacilitator ? "Edit Estimate" : `Estimate: ${story.estimate}`}
                                                aria-label={isFacilitator ? "Edit Estimate" : `Estimate: ${story.estimate}`}
                                            >
                                                {story.estimate}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {stories.length === 0 && <div className="text-center text-slate-500 dark:text-slate-400 py-8">No stories yet. Add one below!</div>}
            </div>
            {isFacilitator && (<form onSubmit={handleAddStory} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2"><input type="text" value={newStoryTitle} onChange={(e) => setNewStoryTitle(e.target.value)} placeholder="Add a new story..." className="flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500" /><button type="submit" className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700">Add</button></form>)}
        </div>
    );
};

const CurrentStory: React.FC<{
    story: Story;
    isFacilitator: boolean;
    isVotingActive: boolean;
}> = ({ story, isFacilitator, isVotingActive }) => {
    const { dispatch } = useCollaborationContext();
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-slate-500 dark:text-slate-400">Story for Estimation</h2>
            <h3 className="text-2xl font-bold mt-1 text-sky-600 dark:text-sky-400 text-center">{story.title}</h3>
            {isFacilitator && !isVotingActive && (<button onClick={() => dispatch({ type: 'START_VOTING' })} className="mt-6 flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-all text-lg transform hover:scale-105"><StartVotingIcon className="w-6 h-6" />Start Voting</button>)}
        </div>
    );
}

export default function PlanningView() {
    const { state, currentUser } = useCollaborationContext();
    const { stories, currentStoryId, facilitatorId, isVotingActive } = state;
    const isFacilitator = currentUser.id === facilitatorId;
    const currentStory = useMemo(() => stories.find(s => s.id === currentStoryId), [stories, currentStoryId]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-full">
            <div className="md:col-span-2 h-[50vh] md:h-auto">
                <StoryList isFacilitator={isFacilitator} />
            </div>
            <div className="md:col-span-3 flex flex-col gap-6">
                {currentStory ? (
                    <>
                        <CurrentStory story={currentStory} isFacilitator={isFacilitator} isVotingActive={isVotingActive} />
                        <ResultsDisplay />
                        <VotingArea />
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full bg-white dark:bg-slate-800 rounded-lg shadow-md p-8">
                        <h2 className="text-2xl font-semibold text-center text-slate-500 dark:text-slate-400">Select a story to begin estimating, or add a new one.</h2>
                    </div>
                )}
            </div>
        </div>
    );
}