
import { useRef, useEffect, useCallback, useState } from 'react';
import type { ConnectionStatus } from '../types';

// PeerJS is loaded from a script tag in index.html
declare var Peer: any; 

type UseCollaborationProps = {
    peer: any;
    isFacilitator: boolean;
    facilitatorId: string;
    onMessage: (senderId: string, data: any) => void;
    onOpen: (peerId: string) => void;
    onPeerDisconnect: (peerId: string) => void;
    initialConnection: any | null;
};

const PING_INTERVAL = 5000; // 5 seconds
const CONNECTION_TIMEOUT = 15000; // 15 seconds

export const useCollaboration = ({ peer, isFacilitator, facilitatorId, onMessage, onOpen, onPeerDisconnect, initialConnection }: UseCollaborationProps) => {
    const peerRef = useRef<any>(null);
    const connectionsRef = useRef<Record<string, any>>({});
    const processedConnectionsRef = useRef<Set<any>>(new Set());
    const [isReady, setIsReady] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const heartbeatTimeoutRef = useRef<number | null>(null);

    const internalStateRef = useRef({ onMessage, onOpen, onPeerDisconnect, facilitatorId, isFacilitator, initialConnection });
    useEffect(() => {
        internalStateRef.current = { onMessage, onOpen, onPeerDisconnect, facilitatorId, isFacilitator, initialConnection };
    }, [onMessage, onOpen, onPeerDisconnect, facilitatorId, isFacilitator, initialConnection]);

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
    }, []);

    const handleNewConnection = useCallback((conn: any) => {
        // Check if we've already processed this exact connection object
        if (processedConnectionsRef.current.has(conn)) {
            console.log(`Connection ${conn.peer} already processed, skipping duplicate setup.`);
            return;
        }
        processedConnectionsRef.current.add(conn);

        if (connectionsRef.current[conn.peer]) {
            console.warn(`Duplicate connection from ${conn.peer}, closing old one.`);
            connectionsRef.current[conn.peer].close();
        }
        connectionsRef.current[conn.peer] = conn;

        // Attach listeners that can fire at any time after creation
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
            processedConnectionsRef.current.delete(conn);
            if (conn.peer === internalStateRef.current.facilitatorId) {
                setConnectionStatus('disconnected');
            }
        };

        conn.on('close', handleClose);
        conn.on('error', (err: any) => {
             console.error(`Connection error with ${conn.peer}:`, err);
             handleClose();
        });

        // Now, handle the 'open' event, which might have already happened for initial connections.
        if (conn.open) {
            console.log(`Data channel with ${conn.peer} was already open.`);
            internalStateRef.current.onOpen(conn.peer);
        } else {
            conn.on('open', () => {
                console.log(`Data channel opened with ${conn.peer}`);
                internalStateRef.current.onOpen(conn.peer);
            });
        }
    }, [handleMessage]);

    useEffect(() => {
        if (!peer || peer.destroyed) {
            console.warn("useCollaboration received no peer or a destroyed peer.");
            return;
        }

        peerRef.current = peer;
        setIsReady(true);
        
        if (initialConnection) {
            console.log("Hook received an initial connection, setting it up.");
            // Use a timeout to ensure all other state has settled before processing
            setTimeout(() => handleNewConnection(initialConnection), 0);
        }

        peer.off('connection', handleNewConnection);
        peer.off('disconnected');
        peer.off('error');

        peer.on('connection', handleNewConnection);

        peer.on('disconnected', () => {
            console.log('Peer disconnected from signaling server. Attempting to reconnect...');
            peer.reconnect();
        });

        peer.on('error', (err: any) => {
            console.error('PeerJS error:', err);
            if (err.type === 'peer-unavailable' && !internalStateRef.current.isFacilitator) {
                setConnectionStatus('disconnected');
            }
        });

        return () => {
            if (peerRef.current) {
                peerRef.current.off('connection', handleNewConnection);
            }
            if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
        };
    }, [peer, initialConnection, handleNewConnection]);

    useEffect(() => {
        if (isFacilitator && isReady) {
            const intervalId = setInterval(() => {
                const pingMsg = JSON.stringify({ type: 'PING' });
                Object.values(connectionsRef.current).forEach((conn: any) => {
                    if (conn?.open) conn.send(pingMsg);
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
            
            // If we already have a connection, resolve immediately.
            if (connectionsRef.current[peerId]?.open) {
                return resolve();
            }
    
            if (!isFacilitator) setConnectionStatus('connecting');

            console.log(`Attempting to connect/re-verify connection to ${peerId}`);
            const conn = peerRef.current.connect(peerId, {
                reliable: true,
                serialization: 'json'
            });
            
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

    // If an initial connection is provided for a participant, their status is connected from the start.
    useEffect(() => {
      if(initialConnection && !isFacilitator) {
        setConnectionStatus('connected');
      }
    }, [initialConnection, isFacilitator]);

    return { connect, broadcast, send, isReady, connectionStatus, reconnect };
};
