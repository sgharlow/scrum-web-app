import { useRef, useEffect, useCallback, useState } from 'react';
import type { ConnectionStatus } from '../types';

// PeerJS is loaded from a script tag in index.html
declare var Peer: any; 

type UseCollaborationProps = {
    myId: string;
    isFacilitator: boolean;
    facilitatorId: string;
    onMessage: (senderId: string, data: any) => void;
    onOpen: (peerId: string) => void;
    onPeerDisconnect: (peerId: string) => void;
};

const PING_INTERVAL = 5000; // 5 seconds
const CONNECTION_TIMEOUT = 15000; // 15 seconds

export const useCollaboration = ({ myId, isFacilitator, facilitatorId, onMessage, onOpen, onPeerDisconnect }: UseCollaborationProps) => {
    const peerRef = useRef<any>(null);
    const connectionsRef = useRef<Record<string, any>>({});
    const [isReady, setIsReady] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const heartbeatTimeoutRef = useRef<number | null>(null);

    // Use a single ref to hold all callbacks and props that change over time.
    // This allows our stable event handlers to always access the latest values, preventing stale closures.
    const internalStateRef = useRef({ onMessage, onOpen, onPeerDisconnect, facilitatorId });
    useEffect(() => {
        internalStateRef.current = { onMessage, onOpen, onPeerDisconnect, facilitatorId };
    }, [onMessage, onOpen, onPeerDisconnect, facilitatorId]);

    const handleMessage = useCallback((senderId: string, message: any) => {
        if (message.type === 'PING') {
            const conn = connectionsRef.current[senderId];
            if (conn?.open) {
                conn.send(JSON.stringify({ type: 'PONG' }));
            }
            if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = window.setTimeout(() => {
                console.warn("Connection timed out. No PING received.");
                setConnectionStatus('disconnected');
            }, CONNECTION_TIMEOUT);
            setConnectionStatus(prev => prev === 'connected' ? prev : 'connected');
        } else if (message.type === 'PONG') {
            // No action needed, connection is alive
        } else {
            internalStateRef.current.onMessage(senderId, message);
        }
    }, []); // This function is now stable and created only once.

    const handleNewConnection = useCallback((conn: any) => {
        if (connectionsRef.current[conn.peer]) {
            console.warn(`Duplicate connection from ${conn.peer}, closing old one.`);
            connectionsRef.current[conn.peer].close();
        }
        connectionsRef.current[conn.peer] = conn;

        conn.on('open', () => {
            console.log(`Data channel opened with ${conn.peer}`);
            internalStateRef.current.onOpen(conn.peer);
        });

        conn.on('data', (data: string) => {
            try {
                handleMessage(conn.peer, JSON.parse(data));
            } catch (error) {
                console.error("Failed to parse message from peer:", error);
            }
        });

        const handleClose = () => {
            console.log(`Connection with ${conn.peer} closed.`);
            internalStateRef.current.onPeerDisconnect(conn.peer);
            delete connectionsRef.current[conn.peer];
            if (conn.peer === internalStateRef.current.facilitatorId) {
                setConnectionStatus('disconnected');
            }
        };

        conn.on('close', handleClose);
        conn.on('error', (err: any) => {
             console.error(`Connection error with ${conn.peer}:`, err);
             handleClose(); // Treat error as a close event for cleanup
        });
    }, [handleMessage]); // Stable because handleMessage is stable.

    // Peer initialization and event listener setup
    useEffect(() => {
        if (!myId || peerRef.current) return; // Only run once for a given myId

        const peer = new Peer(myId, { debug: 2 });
        peerRef.current = peer;

        peer.on('open', (id: string) => {
            console.log('My peer ID is: ' + id);
            setIsReady(true);
        });

        peer.on('connection', handleNewConnection);

        peer.on('disconnected', () => {
            console.log('Peer disconnected from signaling server. Attempting to reconnect...');
            peer.reconnect();
        });

        peer.on('error', (err: any) => {
            console.error('PeerJS error:', err);
            if (err.type === 'peer-unavailable' && !isFacilitator) {
                setConnectionStatus('disconnected');
            }
        });

        return () => {
            console.log("Destroying peer connection.");
            if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
            peer.destroy();
            peerRef.current = null;
        };
    }, [myId, isFacilitator, handleNewConnection]);

    // Facilitator's heartbeat sender
    useEffect(() => {
        if (isFacilitator && isReady) {
            const intervalId = setInterval(() => {
                const pingMsg = JSON.stringify({ type: 'PING' });
                Object.values(connectionsRef.current).forEach((conn: any) => {
                    if (conn?.open) {
                        conn.send(pingMsg);
                    }
                });
            }, PING_INTERVAL);
            setConnectionStatus('connected');
            return () => clearInterval(intervalId);
        }
    }, [isFacilitator, isReady]);

    const connect = useCallback((peerId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!peerRef.current || peerRef.current.destroyed) {
                return reject(new Error("Peer is not initialized or is destroyed."));
            }
    
            if (!isFacilitator) setConnectionStatus('connecting');

            console.log(`Attempting to connect/re-verify connection to ${peerId}`);
            const conn = peerRef.current.connect(peerId, { reliable: true });
            
            if (!conn) {
                if (!isFacilitator) setConnectionStatus('disconnected');
                return reject(new Error(`Failed to create connection object for ${peerId}`));
            }
    
            const timeoutId = setTimeout(() => {
                console.warn(`Connection attempt to ${peerId} timed out.`);
                cleanup();
                conn.close();
                if (!isFacilitator) setConnectionStatus('disconnected');
                reject(new Error(`Connection to ${peerId} timed out.`));
            }, 7000);
    
            const onOpen = () => {
                clearTimeout(timeoutId);
                cleanup();
                handleNewConnection(conn);
                if (!isFacilitator) {
                    setConnectionStatus('connected');
                     if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
                     heartbeatTimeoutRef.current = window.setTimeout(() => {
                         console.warn("Connection timed out right after opening. No PING received.");
                         setConnectionStatus('disconnected');
                     }, CONNECTION_TIMEOUT);
                }
                resolve();
            };
    
            const onError = (err: any) => {
                clearTimeout(timeoutId);
                cleanup();
                if (!isFacilitator) setConnectionStatus('disconnected');
                console.error(`Connection object for ${peerId} emitted error:`, err);
                reject(err);
            };
            
            const cleanup = () => {
                 conn.off('open', onOpen);
                 conn.off('error', onError);
            };
    
            conn.on('open', onOpen);
            conn.on('error', onError);
        });
    }, [handleNewConnection, isFacilitator]);
    
    const reconnect = useCallback(() => {
        if (!isFacilitator) {
            const fid = internalStateRef.current.facilitatorId;
            if (fid) {
                console.log("Attempting to reconnect to facilitator...");
                connect(fid).catch(err => {
                    console.error("Reconnect failed:", err);
                });
            }
        }
    }, [isFacilitator, connect]);


    const broadcast = (payload: unknown) => {
        const message = JSON.stringify(payload);
        Object.values(connectionsRef.current).forEach((conn: any) => {
            if (conn?.open) {
                conn.send(message);
            }
        });
    };

    const send = (peerId: string, payload: unknown) => {
        const conn = connectionsRef.current[peerId];
        const message = JSON.stringify(payload);
        if (conn?.open) {
            conn.send(message);
        } else {
            console.warn(`No open channel for peer ${peerId}`);
        }
    };

    return { connect, broadcast, send, isReady, connectionStatus, reconnect };
};