import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebRTCOptions {
  callId: string;
  token: string;
  isInitiator: boolean;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export function useWebRTC({
  callId,
  token,
  isInitiator,
  onRemoteStream,
  onConnectionStateChange,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isConnected, setIsConnected] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to signaling server
        fetch('/api/webrtc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            callId,
            type: 'ice-candidate',
            data: event.candidate,
          }),
        }).catch(console.error);
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStream(stream);
      onRemoteStream?.(stream);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);
      onConnectionStateChange?.(state);
      
      if (state === 'connected') {
        setIsConnected(true);
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setIsConnected(false);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [callId, token, onRemoteStream, onConnectionStateChange]);

  const initializeMedia = useCallback(async (video: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video,
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, [createPeerConnection]);

  const createOffer = useCallback(async () => {
    if (!peerConnectionRef.current) return;
    
    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      // Send offer to signaling server
      await fetch('/api/webrtc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          callId,
          type: 'offer',
          data: offer,
        }),
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [callId, token]);

  const createAnswer = useCallback(async () => {
    if (!peerConnectionRef.current) return;
    
    try {
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      // Send answer to signaling server
      await fetch('/api/webrtc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          callId,
          type: 'answer',
          data: answer,
        }),
      });
    } catch (error) {
      console.error('Error creating answer:', error);
    }
  }, [callId, token]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      await createAnswer();
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createAnswer]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  const startSignaling = useCallback(() => {
    // Poll for signaling data
    signalingIntervalRef.current = setInterval(async () => {
      try {
        // Check for offer
        const offerResponse = await fetch(`/api/webrtc?callId=${callId}&type=offer`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (offerResponse.ok) {
          const { data: offer } = await offerResponse.json();
          if (offer && !isInitiator) {
            await handleOffer(offer);
          }
        }

        // Check for answer
        const answerResponse = await fetch(`/api/webrtc?callId=${callId}&type=answer`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (answerResponse.ok) {
          const { data: answer } = await answerResponse.json();
          if (answer && isInitiator) {
            await handleAnswer(answer);
          }
        }

        // Check for ICE candidates
        const candidatesResponse = await fetch(`/api/webrtc?callId=${callId}&type=ice-candidates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (candidatesResponse.ok) {
          const { data: candidates } = await candidatesResponse.json();
          if (candidates && candidates.length > 0) {
            for (const candidate of candidates) {
              await handleIceCandidate(candidate);
            }
          }
        }
      } catch (error) {
        console.error('Signaling error:', error);
      }
    }, 1000);
  }, [callId, token, isInitiator, handleOffer, handleAnswer, handleIceCandidate]);

  const stopSignaling = useCallback(() => {
    if (signalingIntervalRef.current) {
      clearInterval(signalingIntervalRef.current);
      signalingIntervalRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopSignaling();
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('new');
    setIsConnected(false);
  }, [stopSignaling]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    localStream,
    remoteStream,
    connectionState,
    isConnected,
    initializeMedia,
    createOffer,
    createAnswer,
    startSignaling,
    stopSignaling,
    cleanup,
  };
} 