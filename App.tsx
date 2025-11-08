import React, { useState, useMemo, useEffect, useRef, useContext, useReducer, useCallback } from 'react';
import type { Story, VoteValue, RoomMode, Participant, AppState, Action } from './types';
import ParticipantList from './components/ParticipantList';
import PlanningView from './components/StoryLane';
import RetroMode from './components/RetroMode';
import { PlusIcon, TrashIcon, HeartIcon, PlayIcon, PauseIcon, ResetIcon, SunIcon, MoonIcon, ClipboardIcon, LinkIcon, UnlinkIcon, CrownIcon, XMarkIcon } from './components/Icons';
import { AVATAR_OPTIONS, ICEBREAKER_QUESTIONS } from './constants';
import { appReducer, initialState } from './state';
import { useCollaboration } from './hooks/useCollaboration';


// --- CONTEXT ---
const CollaborationContext = React.createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
    currentUser: Participant;
} | null>(null);

export const useCollaborationContext = () => {
    const context = useContext(CollaborationContext);
    if (!context) throw new Error("useCollaborationContext must be used within a CollaborationProvider");
    return context;
};

// --- UTILS ---
const adjectives = ['Agile', 'Brave', 'Clever', 'Devoted', 'Eager', 'Fearless', 'Great', 'Happy', 'Intrepid', 'Jolly', 'Keen', 'Lucky'];
const nouns = ['Aardvark', 'Badger', 'Cheetah', 'Dolphin', 'Eagle', 'Falcon', 'Gibbon', 'Heron', 'Ibex', 'Jaguar', 'Koala', 'Lemur'];
const generateRandomName = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

// --- THEME TOGGLE ---
const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
    useEffect(() => {
        const root = window.document.documentElement;
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (theme === 'dark' || (theme === 'system' && systemTheme === 'dark')) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');

    return (
        <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" aria-label="Toggle theme">
            <SunIcon className="w-6 h-6 text-slate-800 dark:hidden" />
            <MoonIcon className="w-6 h-6 text-slate-200 hidden dark:inline" />
        </button>
    );
};

// --- LOBBY COMPONENT ---
const Lobby: React.FC<{ onJoinRoom: (name: string, code: string, avatar: string, isCreating: boolean) => void }> = ({ onJoinRoom }) => {
  const [name, setName] = useState(generateRandomName);
  const [code, setCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        setCode(hash);
    }
  }, []);

  const generateRoomCode = () => `room-${Math.random().toString(36).substr(2, 6)}`;
  const handleJoin = (e: React.FormEvent) => { e.preventDefault(); if (name.trim() && code.trim()) onJoinRoom(name.trim(), code.trim(), selectedAvatar, false); };
  const handleCreate = () => { if (name.trim()) onJoinRoom(name.trim(), generateRoomCode(), selectedAvatar, true); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-sky-600 dark:text-sky-400">Scrum Facilitator</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Instant agile ceremonies.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Choose your Avatar</label>
          <div className="flex justify-center gap-3 flex-wrap">{AVATAR_OPTIONS.map(avatar => (<button key={avatar} onClick={() => setSelectedAvatar(avatar)} className={`p-1 rounded-full transition-all ${selectedAvatar === avatar ? 'ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-800' : ''}`}><img src={avatar} alt="avatar" className="w-12 h-12 rounded-full" /></button>))}</div>
        </div>
        <div className="space-y-4">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 text-lg" />
          <form onSubmit={handleJoin} className="flex gap-2">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter room code" className="flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 text-lg" />
            <button type="submit" disabled={!name.trim() || !code.trim()} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-slate-400 transition-colors">Join</button>
          </form>
        </div>
        <div className="flex items-center gap-4"><hr className="flex-grow border-slate-200 dark:border-slate-700" /><span className="text-slate-400">OR</span><hr className="flex-grow border-slate-200 dark:border-slate-700" /></div>
        <button onClick={handleCreate} disabled={!name.trim()} className="w-full px-6 py-4 bg-sky-600 text-white font-bold text-lg rounded-md hover:bg-sky-700 disabled:bg-slate-400 transition-colors">Create New Room</button>
      </div>
    </div>
  );
};

// --- TIMER COMPONENT ---
const Timer: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef<number | null>(null);
    useEffect(() => {
        if (isRunning && timeLeft > 0) { timerRef.current = window.setInterval(() => { setTimeLeft(prev => prev - 1); }, 1000); }
        else if (timeLeft === 0 && isRunning) { setIsRunning(false); }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning, timeLeft]);
    const startTimer = (minutes: number) => { if (timerRef.current) clearInterval(timerRef.current); setTimeLeft(minutes * 60); setIsRunning(true); };
    const togglePause = () => setIsRunning(prev => !prev);
    const resetTimer = () => { if (timerRef.current) clearInterval(timerRef.current); setIsRunning(false); setTimeLeft(0); };
    const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const TimeButton: React.FC<{ minutes: number }> = ({ minutes }) => (<button onClick={() => startTimer(minutes)} className="text-xs px-2 py-1 bg-slate-300 dark:bg-slate-600 rounded hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors">{minutes}m</button>);
    return (<div className="flex items-center gap-2 p-1 rounded-lg bg-slate-200/50 dark:bg-slate-800"><div className="font-mono text-lg font-bold w-20 text-center">{formatTime(timeLeft)}</div><div className="flex items-center gap-2">{!isRunning && timeLeft === 0 ? (<><TimeButton minutes={5} /><TimeButton minutes={10} /><TimeButton minutes={15} /></>) : (<><button onClick={togglePause} className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700">{isRunning ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}</button><button onClick={resetTimer} className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700"><ResetIcon className="w-5 h-5" /></button></>)}</div></div>);
}

// --- PROVIDER & MAIN ROOM COMPONENT ---
const CollaborationProvider: React.FC<{ children: React.ReactNode, roomCode: string, currentUser: Participant, facilitatorId: string }> = ({ children, roomCode, currentUser, facilitatorId }) => {
    const [state, localDispatch] = useReducer(appReducer, {
        ...initialState,
        roomCode,
        facilitatorId,
        participants: [currentUser],
        icebreaker: ICEBREAKER_QUESTIONS[Math.floor(Math.random() * ICEBREAKER_QUESTIONS.length)],
    });

    const isFacilitator = currentUser.id === facilitatorId;
    const broadcastRef = useRef<(payload: any) => void>(() => {});
    const sendRef = useRef<(peerId: string, payload: any) => void>(() => {});

    // This effect synchronizes the facilitator's state to all participants
    useEffect(() => {
        if (isFacilitator) {
            broadcastRef.current({ type: 'SET_STATE', payload: state });
        }
    }, [state, isFacilitator]);

    const dispatch = (action: Action) => {
        if (isFacilitator) {
            localDispatch(action);
        } else {
            // Participants send their actions to the facilitator to be processed.
            sendRef.current(facilitatorId, action);
        }
    };

    const onMessage = useCallback((senderId: string, message: any) => {
        if (isFacilitator) {
            // Facilitator processes messages (introductions and actions) from participants
            if (message.type === 'INTRODUCE_SELF') {
                localDispatch({ type: 'ADD_PARTICIPANT', payload: message.payload });
            } else {
                localDispatch(message as Action);
            }
        } else {
            // Participants only accept SET_STATE messages from the facilitator
            if (message.type === 'SET_STATE') {
                const remoteState = message.payload as AppState;
                // Preserve the current user's object to prevent UI glitches
                remoteState.participants = [
                    ...remoteState.participants.filter(p => p.id !== currentUser.id),
                    currentUser
                ];
                localDispatch({ type: 'SET_STATE', payload: remoteState });
            }
        }
    }, [isFacilitator, currentUser]);
    
    const onOpen = useCallback((peerId: string) => {
        console.log(`Connection opened with ${peerId}.`);
        // When a participant connects to the facilitator, they introduce themselves.
        if (!isFacilitator && peerId === facilitatorId) {
            sendRef.current(facilitatorId, { type: 'INTRODUCE_SELF', payload: currentUser });
        }
    }, [isFacilitator, facilitatorId, currentUser]);

    const onPeerDisconnect = useCallback((peerId: string) => {
        console.log('Peer disconnected:', peerId);
        if (isFacilitator) {
            localDispatch({ type: 'REMOVE_PARTICIPANT', payload: peerId });
        }
    }, [isFacilitator]);

    const { connect, broadcast, send, isReady } = useCollaboration({ myId: currentUser.id, onMessage, onOpen, onPeerDisconnect });
    
    broadcastRef.current = broadcast;
    sendRef.current = send;

    // Auto-connect for participants to the facilitator, only after their own peer is ready.
    useEffect(() => {
        if (!isFacilitator && isReady) {
            console.log(`Participant is ready, connecting to facilitator: ${facilitatorId}`);
            connect(facilitatorId);
        }
    }, [isFacilitator, facilitatorId, connect, isReady]);

    return (
        <CollaborationContext.Provider value={{ state, dispatch, currentUser }}>
            {children}
        </CollaborationContext.Provider>
    );
}

const Room: React.FC<{ onLeave: () => void }> = ({ onLeave }) => {
  const { state, dispatch, currentUser } = useCollaborationContext();
  const { roomCode, mode, isVotingActive, icebreaker } = state;
  const [copyStatus, setCopyStatus] = useState('Copy Link');
  const roomUrl = `${window.location.origin}${window.location.pathname}#${roomCode}`;

  useEffect(() => { document.body.classList.toggle('voting-active-bg', isVotingActive && mode === 'planning'); return () => { document.body.classList.remove('voting-active-bg'); } }, [isVotingActive, mode]);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl).then(() => { setCopyStatus('Copied!'); setTimeout(() => setCopyStatus('Copy Link'), 2000); });
  };
  
  const handleSetMode = (targetMode: RoomMode) => dispatch({ type: 'SET_MODE', payload: targetMode });
  const ModeButton: React.FC<{ targetMode: RoomMode; children: React.ReactNode }> = ({ targetMode, children }) => (<button onClick={() => handleSetMode(targetMode)} className={`px-4 py-2 rounded-md font-semibold transition-colors ${mode === targetMode ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>{children}</button>);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <header className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-400">Scrum Room</h1>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Room Code: <span className="font-mono bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">{roomCode}</span></p>
                    <button onClick={handleCopyLink} className="flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline"><ClipboardIcon className="w-4 h-4" /> {copyStatus}</button>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Timer />
                <div className="flex items-center space-x-2 bg-slate-200/50 dark:bg-slate-800 p-1 rounded-lg"><ModeButton targetMode="planning">Planning Poker</ModeButton><ModeButton targetMode="retro">Retrospective</ModeButton></div>
                <ThemeToggle />
            </div>
        </div>
        {icebreaker && (<div className="mt-4 text-center bg-sky-100/50 dark:bg-sky-900/20 p-3 rounded-lg"><p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Icebreaker: <span className="font-normal">{icebreaker}</span></p></div>)}
      </header>
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 mt-4">
        <div className="lg:col-span-1"><ParticipantList /></div>
        <div className="lg:col-span-3 flex flex-col gap-6">{mode === 'planning' ? <PlanningView /> : <RetroMode currentUser={currentUser} />}</div>
      </main>
    </div>
  );
};

// --- ROOT APP COMPONENT ---
export default function App() {
  const [roomInfo, setRoomInfo] = useState<{ code: string; participant: Participant; facilitatorId: string } | null>(null);

  const joinRoom = (name: string, code: string, avatar: string, isCreating: boolean) => {
    // The facilitator's internal PeerJS ID is derived from the public room code.
    // This makes it predictable for others to connect to, but distinct from the room code itself.
    const facilitatorPeerId = `scrum-facilitator-peer-${code}`;
    
    // Participants get a unique, fresh ID every time they join a room.
    const myPeerId = isCreating ? facilitatorPeerId : crypto.randomUUID();
    
    const participant: Participant = { id: myPeerId, name, avatar };
    
    // The public-facing code in the URL and UI remains the simple one.
    setRoomInfo({ code, participant, facilitatorId: facilitatorPeerId });

    const newHash = `${code}`;
    if (window.location.hash !== `#${newHash}`) {
        window.location.hash = newHash;
    }
  };

  const leaveRoom = () => { setRoomInfo(null); window.location.hash = ''; }

  if (!roomInfo) return <Lobby onJoinRoom={joinRoom} />;
  
  return (
    <CollaborationProvider roomCode={roomInfo.code} currentUser={roomInfo.participant} facilitatorId={roomInfo.facilitatorId}>
        <Room onLeave={leaveRoom} />
    </CollaborationProvider>
  );
}