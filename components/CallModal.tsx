'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useSocket } from '@/hooks/useSocket';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
}

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  caller: User;
  currentUser: User;
  callType: 'audio' | 'video';
  isIncoming: boolean;
  callId?: string;
  token: string;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
}

export default function CallModal({
  isOpen,
  onClose,
  caller,
  currentUser,
  callType,
  isIncoming,
  callId = 'temp-call-id',
  token,
  onAccept,
  onReject,
  onEndCall,
}: CallModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    localStream,
    remoteStream,
    connectionState,
    isConnected: webrtcConnected,
    initializeMedia,
    createOffer,
    createAnswer,
    startSignaling,
    stopSignaling,
    cleanup,
  } = useWebRTC({
    callId,
    token,
    isInitiator: !isIncoming,
    onRemoteStream: (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    },
    onConnectionStateChange: (state) => {
      if (state === 'connected') {
        setIsConnected(true);
      }
    },
  });

  const { sendCallOffer, sendCallAnswer, sendCallEnd } = useSocket({
    token,
    onCallOffer: (data) => {
      console.log('Call offer received in modal:', data);
      // Handle incoming call offer
    },
    onCallAnswer: (data) => {
      console.log('Call answer received in modal:', data);
      // Handle call answer
    },
    onCallEnd: (data) => {
      console.log('Call end received in modal:', data);
      cleanup();
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen && !isIncoming) {
      initializeCall();
    }
  }, [isOpen, isIncoming]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const initializeCall = async () => {
    try {
      await initializeMedia(callType === 'video');
      const offer = await createOffer();
      
      // Send call offer through WebSocket
      sendCallOffer(caller._id, offer, callType);
      
      startSignaling();
    } catch (error) {
      console.error('Error initializing call:', error);
    }
  };

  const handleAccept = async () => {
    try {
      await initializeMedia(callType === 'video');
      const answer = await createAnswer();
      
      // Send call answer through WebSocket
      sendCallAnswer(caller._id, answer);
      
      startSignaling();
      onAccept();
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleReject = () => {
    sendCallEnd(caller._id);
    cleanup();
    onReject();
    onClose();
  };

  const handleEndCall = () => {
    sendCallEnd(caller._id);
    cleanup();
    onEndCall();
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center space-y-6 p-6">
          {/* Caller Info */}
          <div className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={caller.avatar} />
              <AvatarFallback className="text-2xl">
                {caller.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">{caller.name}</h3>
            <p className="text-gray-500">
              {isIncoming ? 'Incoming call' : 'Calling...'}
            </p>
            <p className="text-sm text-gray-400">
              {callType === 'video' ? 'Video call' : 'Voice call'}
            </p>
            {connectionState !== 'new' && (
              <p className="text-xs text-gray-400 mt-1">
                Connection: {connectionState}
              </p>
            )}
          </div>

          {/* Video Streams */}
          {callType === 'video' && (isConnected || localStream) && (
            <div className="relative w-full max-w-sm">
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-48 bg-gray-900 rounded-lg"
              />
              {/* Local Video */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-2 right-2 w-24 h-18 bg-gray-800 rounded-lg"
              />
            </div>
          )}

          {/* Call Controls */}
          <div className="flex items-center space-x-4">
            {isIncoming && !isConnected ? (
              <>
                <Button
                  onClick={handleAccept}
                  className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full"
                >
                  <Phone className="w-6 h-6" />
                </Button>
                <Button
                  onClick={handleReject}
                  className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </>
            ) : (
              <>
                {callType === 'video' && (
                  <Button
                    onClick={toggleVideo}
                    variant={isVideoOff ? "destructive" : "outline"}
                    className="p-4 rounded-full"
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </Button>
                )}
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? "destructive" : "outline"}
                  className="p-4 rounded-full"
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                <Button
                  onClick={handleEndCall}
                  className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 