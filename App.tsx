

import React, { useState, useMemo, useEffect, useRef, useContext, useReducer, useCallback } from 'react';
import type { Story, VoteValue, RoomMode, Participant, AppState, Action, ConnectionStatus } from './types';
import ParticipantList from './components/ParticipantList';
import PlanningView from './components/StoryLane';
import RetroMode from './components/RetroMode';
import { PlusIcon, TrashIcon, HeartIcon, PlayIcon, PauseIcon, ResetIcon, SunIcon, MoonIcon, ClipboardIcon, LinkIcon, UnlinkIcon, CrownIcon, XMarkIcon, RefreshIcon } from './components/Icons';
import { AVATAR_OPTIONS, ICEBREAKER_QUESTIONS } from './constants';
import { appReducer, initialState } from './state';
import { useCollaboration } from './hooks/useCollaboration';


// --- CONTEXT ---
const CollaborationContext = React.createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
    currentUser: Participant;
    refreshData: () => Promise<void>;
    connectionStatus: ConnectionStatus;
    reconnect: () => void;
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
const codeAdjectives = ['Swift', 'Red', 'Blue', 'Green', 'Solar', 'Lunar', 'Cosmic', 'Magic'];
const codeNouns = ['River', 'Mountain', 'Forest', 'Star', 'Planet', 'Comet', 'Galaxy', 'Nebula'];
const generateRandomRoomCode = () => `${codeAdjectives[Math.floor(Math.random() * codeAdjectives.length)]}-${codeNouns[Math.floor(Math.random() * codeNouns.length)]}-${Math.floor(100 + Math.random() * 900)}`;


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
const Lobby: React.FC<{
    onJoinRoom: (name: string, code: string, avatar: string) => Promise<void>,
    isJoining: boolean,
    joinError: string | null
}> = ({ onJoinRoom, isJoining, joinError }) => {
  const [name, setName] = useState(generateRandomName);
  const [code, setCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        setCode(hash);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) {
          const roomCode = code.trim() || generateRandomRoomCode();
          onJoinRoom(name.trim(), roomCode, selectedAvatar);
      }
  };

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
        {joinError && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-md animate-slide-in" role="alert">
                <strong className="font-bold">Connection Failed: </strong>
                <span className="block sm:inline">{joinError}</span>
            </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 text-lg" disabled={isJoining} />
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter Room Code (or leave blank)" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 text-lg" disabled={isJoining} />
            <button type="submit" disabled={!name.trim() || isJoining} className="w-full px-6 py-4 bg-sky-600 text-white font-bold text-lg rounded-md hover:bg-sky-700 disabled:bg-slate-400 transition-colors">
                {isJoining ? 'Connecting...' : 'Create / Join Room'}
            </button>
        </form>
      </div>
    </div>
  );
};

// --- TIMER COMPONENT ---
const Timer: React.FC = () => {
    const { state, dispatch, currentUser } = useCollaborationContext();
    const { timer } = state;
    const isFacilitator = currentUser.id === state.facilitatorId;
    
    const [displayTime, setDisplayTime] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const soundPlayedRef = useRef(false);

    const playSound = () => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
                return;
            }
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
             ctx.resume();
        }
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 1);
    };
    
    useEffect(() => {
        let interval: number | null = null;

        if (timer.isRunning && timer.startTime) {
            soundPlayedRef.current = false;
            const update = () => {
                const elapsed = (Date.now() - timer.startTime!) / 1000;
                const remaining = Math.max(0, timer.duration - elapsed);
                setDisplayTime(remaining);

                if (remaining === 0 && !soundPlayedRef.current) {
                    playSound();
                    soundPlayedRef.current = true;
                    if (isFacilitator) {
                        dispatch({ type: 'TOGGLE_PAUSE_TIMER' });
                    }
                }
            };
            update();
            interval = window.setInterval(update, 1000);
        } else {
            setDisplayTime(timer.duration);
        }

        return () => {
            if (interval) clearInterval(interval);
        };

    }, [timer.isRunning, timer.startTime, timer.duration, isFacilitator]);

    const handleStart = (minutes: number) => {
        if (!isFacilitator) return;
        dispatch({ type: 'START_TIMER', payload: { duration: minutes * 60 } });
    };
    
    const handleTogglePause = () => {
        if (!isFacilitator) return;
        dispatch({ type: 'TOGGLE_PAUSE_TIMER' });
    };
    
    const handleReset = () => {
        if (!isFacilitator) return;
        dispatch({ type: 'RESET_TIMER' });
    };

    const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    const TimeButton: React.FC<{ minutes: number }> = ({ minutes }) => (<button onClick={() => handleStart(minutes)} disabled={!isFacilitator} className="text-xs px-2 py-1 bg-slate-300 dark:bg-slate-600 rounded hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{minutes}m</button>);

    const hasStarted = timer.duration > 0;

    return (<div className="flex items-center gap-2 p-1 rounded-lg bg-slate-200/50 dark:bg-slate-800"><div className="font-mono text-lg font-bold w-20 text-center">{formatTime(displayTime)}</div><div className="flex items-center gap-2">{!hasStarted ? (<><TimeButton minutes={5} /><TimeButton minutes={10} /><TimeButton minutes={15} /></>) : (<><button onClick={handleTogglePause} disabled={!isFacilitator} className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">{timer.isRunning ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}</button><button onClick={handleReset} disabled={!isFacilitator} className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"><ResetIcon className="w-5 h-5" /></button></>)}</div></div>);
}

// --- PROVIDER & MAIN ROOM COMPONENT ---
const CollaborationProvider: React.FC<{
    children: React.ReactNode;
    roomCode: string;
    currentUser: Participant;
    facilitatorId: string;
    peer: any; // Pass the initialized peer object
    initialConnection: any | null; // The already-established connection for participants
}> = ({ children, roomCode, currentUser, facilitatorId, peer, initialConnection }) => {
    const [state, localDispatch] = useReducer(appReducer, {
        ...initialState,
        roomCode,
        facilitatorId,
        participants: [currentUser],
        icebreaker: ICEBREAKER_QUESTIONS[Math.floor(Math.random() * ICEBREAKER_QUESTIONS.length)],
    });

    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const isFacilitator = currentUser.id === facilitatorId;
    const broadcastRef = useRef<(payload: any) => void>(() => {});
    const sendRef = useRef<(peerId: string, payload: any) => void>(() => {});

    const dispatch = useCallback((action: Action) => {
        if (isFacilitator) {
            // Facilitator is the source of truth, update locally and broadcast
            localDispatch(action);
            if (action.type !== 'SET_STATE') { // Avoid broadcast loops from state sync
                broadcastRef.current(action);
            }
        } else {
            // Participant sends action to facilitator and waits for the state update via broadcast
            sendRef.current(facilitatorId, action);
        }
    }, [isFacilitator, facilitatorId]);


    const onMessage = useCallback((senderId: string, message: any) => {
        if (isFacilitator) {
            if (message.type === 'INTRODUCE_AND_REQUEST_STATE') {
                console.log(`New participant ${senderId} joined. Sending state and introducing.`);
                const participant = message.payload as Participant;
                sendRef.current(senderId, { type: 'SET_STATE', payload: { ...stateRef.current, participants: [...stateRef.current.participants, participant] }});
                dispatch({ type: 'ADD_PARTICIPANT', payload: participant });
            } else if (message.type === 'REQUEST_STATE') {
                console.log(`Received state request from ${senderId}. Sending current state back.`);
                sendRef.current(senderId, { type: 'SET_STATE', payload: stateRef.current });
            } else {
                // Process action from a participant
                localDispatch(message as Action);
                // Broadcast the result of the action to all clients
                broadcastRef.current(message as Action);
            }
        } else {
            // Participant receives an action from the facilitator
            if (message.type === 'SET_STATE') {
                localDispatch({ type: 'SET_STATE', payload: message.payload as AppState });
            } else {
                localDispatch(message as Action);
            }
        }
    }, [isFacilitator, dispatch]);

    const onOpen = useCallback((peerId: string) => {
        console.log(`Connection opened with ${peerId}.`);
        if (!isFacilitator && peerId === facilitatorId) {
            sendRef.current(facilitatorId, { type: 'INTRODUCE_AND_REQUEST_STATE', payload: currentUser });
        }
    }, [isFacilitator, facilitatorId, currentUser]);

    const onPeerDisconnect = useCallback((peerId: string) => {
        console.log('Peer disconnected:', peerId);
        if (isFacilitator) {
            dispatch({ type: 'REMOVE_PARTICIPANT', payload: peerId });
        }
    }, [isFacilitator, dispatch]);

    const { connect, broadcast, send, isReady, connectionStatus, reconnect } = useCollaboration({
        peer,
        isFacilitator,
        facilitatorId,
        onMessage,
        onOpen,
        onPeerDisconnect,
        initialConnection
    });

    broadcastRef.current = broadcast;
    sendRef.current = send;

    const refreshData = useCallback(async () => {
        if (isFacilitator) {
            console.log("Facilitator manually broadcasting full state to all.");
            broadcastRef.current({ type: 'SET_STATE', payload: stateRef.current });
            return;
        } else {
            console.log("Participant attempting to refresh data...");
            await connect(facilitatorId);
            console.log("Connection healthy. Requesting state from facilitator.");
            sendRef.current(facilitatorId, { type: 'REQUEST_STATE' });
        }
    }, [isFacilitator, facilitatorId, connect]);

    return (
        <CollaborationContext.Provider value={{ state, dispatch, currentUser, refreshData, connectionStatus, reconnect }}>
            {children}
        </CollaborationContext.Provider>
    );
}

const ConnectionStatusIndicator: React.FC = () => {
    const { connectionStatus } = useCollaborationContext();
    const statusMap = {
        connected: { color: 'bg-green-500', text: 'Connected to room' },
        connecting: { color: 'bg-yellow-500 animate-pulse', text: 'Connecting...' },
        disconnected: { color: 'bg-red-500', text: 'Connection lost. Attempting to reconnect...' },
    };
    const { color, text } = statusMap[connectionStatus];
    return (
        <div className="flex items-center gap-2 group relative">
            <div className={`w-3 h-3 rounded-full transition-colors ${color}`}></div>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-max bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {text}
            </div>
        </div>
    );
}

const Room: React.FC<{ onLeave: () => void }> = ({ onLeave }) => {
  const { state, dispatch, currentUser, refreshData, connectionStatus, reconnect } = useCollaborationContext();
  const { roomCode, mode, isVotingActive, icebreaker, facilitatorId, areVotesRevealed, showIndividualVotes } = state;
  const [copyStatus, setCopyStatus] = useState('Copy Link');
  const [refreshStatus, setRefreshStatus] = useState('Refresh');
  const roomUrl = `${window.location.origin}${window.location.pathname}#${roomCode}`;
  const isFacilitator = currentUser.id === facilitatorId;

  useEffect(() => { document.body.classList.toggle('voting-active-bg', isVotingActive && mode === 'planning'); return () => { document.body.classList.remove('voting-active-bg'); } }, [isVotingActive, mode]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl).then(() => { setCopyStatus('Copied!'); setTimeout(() => setCopyStatus('Copy Link'), 2000); });
  };

  const handleRefresh = async () => {
    if (connectionStatus === 'disconnected') {
        reconnect();
        return;
    }
    setRefreshStatus('Syncing...');
    try {
        await refreshData();
        setRefreshStatus('Synced!');
        setTimeout(() => setRefreshStatus('Refresh'), 2000);
    } catch (error) {
        console.error("Refresh failed:", error);
        setRefreshStatus('Failed!');
        setTimeout(() => setRefreshStatus('Refresh'), 3000);
    }
  };

  const handleNewIcebreaker = () => {
    const otherQuestions = ICEBREAKER_QUESTIONS.filter(q => q !== icebreaker);
    const questionsPool = otherQuestions.length > 0 ? otherQuestions : ICEBREAKER_QUESTIONS;
    const newIcebreaker = questionsPool[Math.floor(Math.random() * questionsPool.length)];
    dispatch({ type: 'SET_ICEBREAKER', payload: newIcebreaker });
  };

  const handleSetMode = (targetMode: RoomMode) => dispatch({ type: 'SET_MODE', payload: targetMode });
  const ModeButton: React.FC<{ targetMode: RoomMode; children: React.ReactNode }> = ({ targetMode, children }) => (<button onClick={() => handleSetMode(targetMode)} className={`px-4 py-2 rounded-md font-semibold transition-colors ${mode === targetMode ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>{children}</button>);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <header className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
                 <img src={currentUser.avatar} alt={currentUser.name} className="w-12 h-12 rounded-full ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-sky-500" />
                 <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Room: <span className="font-mono bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-md text-base font-semibold">{roomCode}</span></p>
                        <button onClick={handleCopyLink} className="flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline"><ClipboardIcon className="w-4 h-4" /> {copyStatus}</button>
                        <button onClick={handleRefresh} className="flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline" disabled={refreshStatus !== 'Refresh' && connectionStatus !== 'disconnected'}>
                            <RefreshIcon className="w-4 h-4" /> {connectionStatus === 'disconnected' ? 'Reconnect' : refreshStatus}
                        </button>
                        {!isFacilitator && <ConnectionStatusIndicator />}
                    </div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Timer />
                <div className="flex items-center space-x-2 bg-slate-200/50 dark:bg-slate-800 p-1 rounded-lg"><ModeButton targetMode="planning">Planning Poker</ModeButton><ModeButton targetMode="retro">Retrospective</ModeButton></div>
                <ThemeToggle />
            </div>
        </div>
        {icebreaker && (
          <div className="mt-4 flex items-center justify-between gap-4 bg-sky-100/50 dark:bg-sky-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Icebreaker: <span className="font-normal">{icebreaker}</span></p>
                {isFacilitator && (
                  <button onClick={handleNewIcebreaker} title="New icebreaker" className="p-1 rounded-full hover:bg-slate-300/50 dark:hover:bg-slate-600/50 transition-colors">
                    <RefreshIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                )}
            </div>
            
            {isFacilitator && areVotesRevealed && mode === 'planning' && (
              <div className="flex items-center gap-2 animate-slide-in">
                <label htmlFor="show-votes-toggle" className="text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                  Show individual votes
                </label>
                <input
                  type="checkbox"
                  id="show-votes-toggle"
                  checked={showIndividualVotes}
                  onChange={() => dispatch({ type: 'TOGGLE_SHOW_INDIVIDUAL_VOTES' })}
                  className="w-4 h-4 rounded text-sky-600 bg-slate-200 border-slate-300 focus:ring-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:focus:ring-sky-600 dark:ring-offset-slate-900 cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
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
  const [roomInfo, setRoomInfo] = useState<{ code: string; participant: Participant; facilitatorId: string; peer: any; initialConnection: any | null } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const joinRoom = useCallback(async (name: string, code: string, avatar: string) => {
    setIsJoining(true);
    setJoinError(null);

    const facilitatorPeerId = `scrum-facilitator-peer-${code}`;
    
    const setHash = () => {
        if (window.location.hash !== `#${code}`) window.location.hash = code;
    };

    const initializePeer = (id: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            // @ts-ignore PeerJS is loaded from a script tag
            const newPeer = new Peer(id, {
                // To enable connections between different networks,
                // we add multiple STUN and TURN servers for redundancy.
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        {
                            urls: 'turn:openrelay.metered.ca:443',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:80',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        // Adding a redundant TURN server for better reliability
                        {
                            urls: "turn:numb.viagenie.ca:3478",
                            username: "webrtc@live.com",
                            credential: "muazkh"
                        }
                    ],
                    'iceTransportPolicy': 'all',
                    'iceCandidatePoolSize': 10
                }
            });
            const timeout = setTimeout(() => reject(new Error("Signaling server connection timed out.")), 8000);
            newPeer.on('open', () => { clearTimeout(timeout); resolve(newPeer); });
            newPeer.on('error', (err: any) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    };
    
    // Optimistic Facilitator Creation
    try {
        console.log(`Attempting to become facilitator for room ${code} with ID ${facilitatorPeerId}`);
        const facilitatorPeer = await initializePeer(facilitatorPeerId);
        console.log("Successfully became facilitator.");

        // Small delay to ensure facilitator is fully initialized and ready to accept connections
        await new Promise(resolve => setTimeout(resolve, 100));

        const participant: Participant = { id: facilitatorPeerId, name, avatar };
        setRoomInfo({ code, participant, facilitatorId: facilitatorPeerId, peer: facilitatorPeer, initialConnection: null });
        setHash();
        setIsJoining(false);

    } catch (error: any) {
        // This is the expected path for a participant joining an existing room.
        if (error.type === 'unavailable-id') {
            console.log("Facilitator already exists. Joining as participant.");

            // Create peer once and reuse for all connection attempts
            const participantPeerId = `scrum-participant-${Math.random().toString(36).substr(2, 9)}`;
            let participantPeer: any = null;

            try {
                participantPeer = await initializePeer(participantPeerId);
                console.log(`Peer initialized as ${participantPeerId}`);
            } catch (peerError: any) {
                console.error("Failed to initialize peer:", peerError);
                setJoinError("Could not connect to signaling server. Please check your network and try again.");
                setIsJoining(false);
                return;
            }

            const MAX_RETRIES = 2; // Reduced since first attempt now has more time
            let lastError: any = null;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    console.log(`Attempt ${attempt} to connect to facilitator ${facilitatorPeerId}...`);

                    // Progressive timeout - first attempt gets more time for ICE negotiation
                    const timeoutDuration = attempt === 1 ? 25000 : 12000;

                    const conn = await new Promise<any>((resolve, reject) => {
                        const connection = participantPeer.connect(facilitatorPeerId, {
                            reliable: true,
                            serialization: 'json'
                        });
                        if (!connection) return reject(new Error("Failed to create connection object."));

                        // Monitor ICE connection state for debugging
                        const peerConnection = (connection as any).peerConnection;
                        if (peerConnection) {
                            peerConnection.oniceconnectionstatechange = () => {
                                console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
                            };
                        }

                        const timeout = setTimeout(() => {
                            console.warn(`Attempt ${attempt} timed out after ${timeoutDuration}ms`);
                            reject(new Error("Connection to facilitator timed out."));
                        }, timeoutDuration);

                        connection.on('open', () => {
                            clearTimeout(timeout);
                            console.log(`Connection opened on attempt ${attempt}`);
                            resolve(connection);
                        });
                        connection.on('error', (err: any) => {
                            clearTimeout(timeout);
                            reject(err);
                        });
                    });

                    console.log("Successfully connected to facilitator.");
                    const participant: Participant = { id: participantPeerId, name, avatar };
                    setRoomInfo({ code, participant, facilitatorId: facilitatorPeerId, peer: participantPeer, initialConnection: conn });
                    setHash();
                    setIsJoining(false);
                    return; // Exit the joinRoom function on success

                } catch (participantError: any) {
                    console.error(`Attempt ${attempt} failed:`, participantError);
                    lastError = participantError;

                    if (attempt < MAX_RETRIES) {
                        const retryDelay = 500; // Short delay since peer is already initialized
                        console.log(`Waiting ${retryDelay}ms before retry ${attempt + 1}...`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }
            }

            // All retries failed, clean up peer
            if (participantPeer && !participantPeer.destroyed) {
                participantPeer.destroy();
            }
            
            // If loop completes without success
            console.error("All connection attempts failed.", lastError);
            setJoinError("Could not connect to the room. This can happen on restrictive networks or due to temporary issues with the public relay servers. Please try again.");
            setIsJoining(false);

        } else {
            // This is an unexpected error during facilitator creation (e.g., network issue)
            console.error("An unexpected error occurred trying to become facilitator:", error);
            setJoinError("Could not create or join the room. Please check your network and try again.");
            setIsJoining(false);
        }
    }
  }, []);

  const leaveRoom = useCallback(() => {
      if (roomInfo?.peer && !roomInfo.peer.destroyed) {
          roomInfo.peer.destroy();
      }
      setRoomInfo(null);
      window.location.hash = '';
  }, [roomInfo]);

  if (!roomInfo) return <Lobby onJoinRoom={joinRoom} isJoining={isJoining} joinError={joinError} />;

  return (
    <CollaborationProvider
        roomCode={roomInfo.code}
        currentUser={roomInfo.participant}
        facilitatorId={roomInfo.facilitatorId}
        peer={roomInfo.peer}
        initialConnection={roomInfo.initialConnection}
    >
        <Room onLeave={leaveRoom} />
    </CollaborationProvider>
  );
}