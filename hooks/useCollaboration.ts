import { useRef, useEffect, useCallback, useState } from 'react';

// PeerJS is loaded from a script tag in index.html
declare var Peer: any; 

type UseCollaborationProps = {
    myId: string;
    onMessage: (senderId: string, data: any) => void;
    onOpen: (peerId: string) => void;
    onPeerDisconnect: (peerId: string) => void;
};

export const useCollaboration = ({ myId, onMessage, onOpen, onPeerDisconnect }: UseCollaborationProps) => {
    const peerRef = useRef<any>(null);
    const connectionsRef = useRef<Record<string, any>>({});
    const [isReady, setIsReady] = useState(false);

    const handleNewConnection = useCallback((conn: any) => {
        if (connectionsRef.current[conn.peer]) {
            console.warn(`Duplicate connection from ${conn.peer}, closing old one.`);
            connectionsRef.current[conn.peer].close();
        }
        connectionsRef.current[conn.peer] = conn;

        conn.on('open', () => {
            console.log(`Data channel opened with ${conn.peer}`);
            onOpen(conn.peer);
        });

        conn.on('data', (data: string) => {
            try {
                const message = JSON.parse(data);
                onMessage(conn.peer, message);
            } catch (error) {
                console.error("Failed to parse message from peer:", error);
            }
        });

        conn.on('close', () => {
            console.log(`Connection with ${conn.peer} closed.`);
            onPeerDisconnect(conn.peer);
            delete connectionsRef.current[conn.peer];
        });
        
        conn.on('error', (err: any) => {
             console.error(`Connection error with ${conn.peer}:`, err);
             onPeerDisconnect(conn.peer);
             delete connectionsRef.current[conn.peer];
        });

    }, [onMessage, onOpen, onPeerDisconnect]);

    useEffect(() => {
        if (!myId) return;

        const peer = new Peer(myId, {
            // Using the public PeerJS cloud server for signaling.
            // For production, a self-hosted PeerServer is recommended for reliability.
            debug: 2 // 0: errors, 1: warnings, 2: info, 3: verbose
        });
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
            if (err.type === 'peer-unavailable') {
                alert("Could not connect to the facilitator. Please check the room code and ensure the facilitator is in the room.");
            }
        });

        return () => {
            console.log("Destroying peer connection.");
            peer.destroy();
        };
    }, [myId, handleNewConnection]);

    const connect = useCallback((peerId: string) => {
        if (!peerRef.current || connectionsRef.current[peerId]?.open) {
            console.log(`Already connected or connecting to ${peerId}`);
            return;
        }
        console.log(`Attempting to connect to ${peerId}`);
        const conn = peerRef.current.connect(peerId, { reliable: true });
        if(conn){
            handleNewConnection(conn);
        } else {
            console.error(`Failed to create connection to ${peerId}`);
        }
    }, [handleNewConnection]);

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

    return { connect, broadcast, send, isReady };
};