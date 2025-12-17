import React, { useCallback, useEffect } from "react";
import useVideoCallStore from "../../store/videoCallStore.js";
import useUserStore from "../../store/useUserStore.js";
import VideoCallModel from "./VideoCallModel.jsx";

const VideoCallManager = ({ socket }) => {
  const {
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setCallModalOpen,
    endCall,
    setCallStatus,
    setSocket,
    setCurrentUser,
  } = useVideoCallStore();

  const { user } = useUserStore();

  // Set socket and user in store on mount and when they change
  useEffect(() => {
    if (socket && user) {
      setSocket(socket);
      setCurrentUser(user);
    }
  }, [socket, user, setSocket, setCurrentUser]);

  useEffect(() => {
    if (!socket) return;

    //handle incoming call
    const handleIncomingCall = ({
      callerId,
      callerName,
      callerAvatar,
      callType,
      callId,
    }) => {
      setIncomingCall({ callerId, callerName, callerAvatar, callType, callId });
      setCallType(callType);
      setCallModalOpen(true);
      setCallStatus("calling");
    };

    const handleCallEnded = ({ reason }) => {
      setCallStatus("failed");
      setTimeout(() => {
        endCall();
      }, 2000);
    };
    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_failed", handleCallEnded);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_failed", handleCallEnded);
    };
  }, [
    socket,
    setIncomingCall,
    setCallType,
    setCallModalOpen,
    setCallStatus,
    endCall,
  ]);

  return (
    <>
      <VideoCallModel socket={socket} />
    </>
  );
};

export default VideoCallManager;
