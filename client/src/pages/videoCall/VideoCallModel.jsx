import React, { useEffect, useMemo, useRef } from "react";
import useVideoCallStore from "../../store/videoCallStore";
import useUserStore from "../../store/useUserStore";
import useThemeStore from "../../store/themeStore";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaTimes,
  FaVideo,
} from "react-icons/fa";

const VideoCallModel = ({ socket }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionContextRef = useRef(null); // Store call context (participantId, callId) for ICE routing

  const backUserPic =
    "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg?semt=ais_hybrid&w=740&q=80";

  const {
    currentCall,
    incomingCall,
    isCallActive,
    callType,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    peerConnection,
    iceCandidatesQueue,
    isCallModalOpen,
    callStatus,
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setCallModalOpen,
    endCall,
    setCallStatus,
    setLocalStream,
    setRemoteStream,
    setIsCallActive,
    setPeerConnection,
    addIceCandidate,
    processQueuedIceCandidates,
    toggleVideo,
    toggleAudio,
    clearIncomingCall,
  } = useVideoCallStore();

  const { user } = useUserStore();
  const { theme } = useThemeStore();

  const rtcConfig = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun1.l.google.com:19302",
      },
      {
        urls: "stun:stun2.l.google.com:19302",
      },
    ],
  };

  //memoize display the user info & prevent re-renders
  const displayInfo = useMemo(() => {
    if (incomingCall && !isCallActive) {
      return {
        name: incomingCall.callerName,
        avatar: incomingCall.callerAvatar,
      };
    } else if (currentCall) {
      return {
        name: currentCall.participantName,
        avatar: currentCall.participantAvatar,
      };
    }
    return null;
  }, [incomingCall, currentCall, isCallActive]);

  //Connection detection
  useEffect(() => {
    if (peerConnection && remoteStream) {
      console.log("bothe peer connection & remote stream is available");
      setCallStatus("connected");
      setIsCallActive(true);
    }
  }, [peerConnection, remoteStream, setCallStatus, setIsCallActive]);

  //set up local stream when localStream change
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  //set up remote stream when remoteStream change
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  //initialize media early for incoming calls so receiver can toggle before answering
  useEffect(() => {
    if (incomingCall && !localStream && !isCallActive) {
      initializeMedia(callType === "video");
    }
  }, [incomingCall, localStream, isCallActive, callType]);

  //initialize media early for outgoing calls so caller can toggle before answer
  useEffect(() => {
    if (currentCall && !incomingCall && !localStream && !isCallActive) {
      initializeMedia(callType === "video");
    }
  }, [currentCall, incomingCall, localStream, isCallActive, callType]);

  //initailize media stream
  const initializeMedia = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 1280, height: 720 } : false,
        audio: true,
      });
      console.log("Local media stream", stream.getTracks());
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Error accessing media devices.", error);
      throw error;
    }
  };

  //create peer connection
  const createPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(rtcConfig);

    //add local tracks immediately if available
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log(`adding ${track.kind} track`, track.id.slice(0, 8));
        pc.addTrack(track, stream);
      });
    }

    //handle ice candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        // Use the context stored when peer connection was created to avoid stale closures
        const context = peerConnectionContextRef.current;
        const participantId = context?.participantId;
        const callId = context?.callId;

        if (participantId && callId) {
          socket.emit("webrtc_ice_candidate", {
            candidate: event.candidate,
            receiverId: participantId,
            callId: callId,
          });
        } else {
          console.warn("ICE candidate: missing context", {
            participantId,
            callId,
          });
        }
      }
    };

    //handle remote stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const stream = new MediaStream(event.track);
        setRemoteStream(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`connection state`, pc.connectionState);
      if (pc.connectionState === "failed") {
        setCallStatus("failed");
        setTimeout(handleEndCall, 2000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state`, pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log(`Signaling state`, pc.signalingState);
    };

    setPeerConnection(pc);
    return pc;
  };

  //caller: Initialize call after acceptance
  const initializeCallerCall = async () => {
    try {
      setCallStatus("connecting");

      //get media stream
      const stream = await initializeMedia(callType === "video");

      //create peer connection with offer
      const pc = createPeerConnection(stream);

      // Store the receiver context in ref so ICE candidates know where to route
      peerConnectionContextRef.current = {
        participantId: currentCall?.participantId,
        callId: currentCall?.callId,
      };

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
      });

      await pc.setLocalDescription(offer);

      socket.emit("webrtc_offer", {
        offer: offer,
        receiverId: currentCall?.participantId,
        callId: currentCall?.callId,
      });
    } catch (error) {
      console.error("Error initializing caller call:", error);
      setCallStatus("failed");
      setTimeout(handleEndCall, 2000);
    }
  };

  //Receiver: Answer call

  const handleAnswerCall = async () => {
    try {
      //get media
      const stream = await initializeMedia(callType === "video");

      //create peer connection with answer
      const pc = createPeerConnection(stream);

      // Store the caller context in ref so ICE candidates know where to route
      peerConnectionContextRef.current = {
        participantId: incomingCall?.callerId,
        callId: incomingCall?.callId,
      };

      socket.emit("accept_call", {
        callerId: incomingCall?.callerId,
        callId: incomingCall?.callId,
        receiverInfo: {
          userName: user?.userName,
          profilePicture: user?.profilePicture,
        },
      });

      // Note: Do NOT set currentCall here. The receiver should update currentCall
      // only after receiving the webrtc_offer from the caller (in handleWebRTCOffer).
      // This prevents the receiver from being treated as the caller.
      clearIncomingCall();
    } catch (error) {
      console.error("Reciever Error:", error);
      handleEndCall();
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      socket.emit("reject_call", {
        callerId: incomingCall?.callerId,
        callId: incomingCall?.callId,
      });
    }
    endCall();
  };

  const handleEndCall = () => {
    const participantId = currentCall?.participantId || incomingCall?.callerId;
    const callId = currentCall?.callId || incomingCall?.callId;

    if (participantId && callId) {
      socket.emit("end_call", {
        callId: callId,
        participantId: participantId,
      });
    }
    endCall();
  };

  //socket event listners

  useEffect(() => {
    if (!socket) return;

    //call accepted start caller flow
    const handleCallAccepted = ({ receiverName, receiverAvatar }) => {
      if (currentCall) {
        //update current call with receiver info
        const updatedCall = {
          ...currentCall,
          participantName: receiverName || currentCall.participantName,
          participantAvatar: receiverAvatar || currentCall.participantAvatar,
        };
        setCurrentCall(updatedCall);

        setTimeout(() => {
          initializeCallerCall();
        }, 500);
      }
    };

    const handleCallRejected = () => {
      setCallStatus("rejected");
      setTimeout(endCall, 2000);
    };

    const handleCallEnded = () => {
      endCall();
    };

    const handleWebRTCOffer = async ({ offer, senderId, callId }) => {
      if (!peerConnection) return;

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        //across queued ICE candidates
        await processQueuedIceCandidates();

        // For receiver: now that we're getting the offer from the caller,
        // set currentCall to track who we're talking to
        if (!currentCall) {
          setCurrentCall({
            callId: callId,
            participantId: senderId,
            participantName: incomingCall?.callerName,
            participantAvatar: incomingCall?.callerAvatar,
          });
        }

        //create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("webrtc_answer", {
          answer,
          receiverId: senderId,
          callId,
        });
        console.log("Receiver: Answer send waiting for ice candidates");
      } catch (error) {
        console.error("Receiver offer Error:", error);
      }
    };

    //Receiver answer (caller)
    const handleWebRTCAnswer = async ({ answer, senderId, callId }) => {
      if (!peerConnection) return;

      if (peerConnection.signalingState === "closed") {
        console.log("Caller: Peer connection is closed");
        return;
      }

      try {
        //current caller signaling state
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        //process queued ice candidates
        await processQueuedIceCandidates();

        //check reciever
        const receivers = peerConnection.getReceivers();
        console.log("Receivers:", receivers);
      } catch (error) {
        console.error("Caller answer Error:", error);
      }
    };

    //Reciever ice candidate
    const handleWebRTCIceCandidate = async ({ candidate, senderId }) => {
      if (peerConnection && peerConnection.signalingState !== "closed") {
        if (peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("Added ICE candidate from", senderId);
          } catch (error) {
            console.log("ICE candidate error", error);
          }
        } else {
          addIceCandidate(candidate);
          console.log("Queuing ICE candidate from", senderId);
        }
      }
    };

    //Register all events listeners
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_ended", handleCallEnded);
    socket.on("webrtc_offer", handleWebRTCOffer);
    socket.on("webrtc_answer", handleWebRTCAnswer);
    socket.on("webrtc_ice_candidate", handleWebRTCIceCandidate);

    console.log("socket listners registers");
    return () => {
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
      socket.off("webrtc_offer", handleWebRTCOffer);
      socket.off("webrtc_answer", handleWebRTCAnswer);
      socket.off("webrtc_ice_candidate", handleWebRTCIceCandidate);
      console.log("socket listners removed");
    };
  }, [socket, peerConnection, currentCall, incomingCall, user]);

  if (!isCallModalOpen && !incomingCall) return null;

  const shouldShowActiveCall =
    isCallActive || callStatus === "calling" || callStatus === "connecting";

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(168, 85, 247, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(168, 85, 247, 0);
          }
        }
        
        @keyframes bounce-soft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
          50% { text-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
        }
        
        .pulse-ring {
          animation: pulse-ring 2s infinite;
        }
        
        .bounce-soft {
          animation: bounce-soft 2s infinite;
        }
        
        .glow-text {
          animation: glow 2s infinite;
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 backdrop-blur-sm">
        <div
          className={`relative w-full h-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-purple-500/30 ${
            theme === "dark"
              ? "bg-linear-to-br from-gray-900 to-gray-950"
              : "bg-white"
          }`}
        >
          {/* incoming call ui */}
          {incomingCall && !isCallActive && (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-linear-to-b from-purple-900/20 to-transparent">
              <div className="text-center mb-12 animate-bounce-soft">
                <div className="relative w-40 h-40 mx-auto mb-8">
                  <div className="absolute inset-0 bg-linear-to-br from-purple-500 to-pink-500 rounded-full blur-xl opacity-50"></div>
                  <div className="relative w-40 h-40 rounded-full bg-linear-to-br from-gray-300 to-gray-400 mx-auto overflow-hidden border-4 border-purple-400 shadow-lg">
                    <img
                      src={displayInfo?.avatar || backUserPic}
                      alt={displayInfo?.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h2
                  className={`text-4xl font-bold mb-3 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {displayInfo?.name || "Unknown User"}
                </h2>
                <p
                  className={`text-xl ${
                    theme === "dark" ? "text-purple-300" : "text-purple-600"
                  } glow-text`}
                >
                  📞 Incoming {callType} call...
                </p>
              </div>

              <div className="flex space-x-8 mb-4">
                <button
                  onClick={handleRejectCall}
                  className="group relative w-20 h-20 bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-red-500/50 border-2 border-red-400/50"
                >
                  <div className="absolute inset-0 rounded-full bg-red-500 opacity-0 group-hover:opacity-20 blur-md transition-opacity"></div>
                  <FaPhoneSlash className="w-8 h-8 relative z-10" />
                </button>
                <button
                  onClick={handleAnswerCall}
                  className="group relative w-20 h-20 bg-linear-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-full flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-purple-500/50 border-2 border-purple-400/50 pulse-ring"
                >
                  <div className="absolute inset-0 rounded-full bg-purple-500 opacity-0 group-hover:opacity-20 blur-md transition-opacity"></div>
                  <FaVideo className="w-8 h-8 relative z-10" />
                </button>
              </div>

              {/* Media controls for incoming call */}
              <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md rounded-full px-4 py-3 border border-purple-400/30 shadow-lg">
                {callType === "video" && (
                  <button
                    onClick={() => toggleVideo()}
                    className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 border-2 ${
                      isVideoEnabled
                        ? "bg-linear-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-green-400/50 shadow-lg hover:shadow-green-500/50"
                        : "bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-red-400/50 shadow-lg hover:shadow-red-500/50"
                    }`}
                    title={isVideoEnabled ? "Turn off video" : "Turn on video"}
                  >
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity group-hover:bg-white"></div>
                    <FaVideo
                      className="w-5 h-5 text-white relative z-10"
                      style={{
                        opacity: isVideoEnabled ? 1 : 0.5,
                        textDecoration: isVideoEnabled
                          ? "none"
                          : "line-through",
                      }}
                    />
                  </button>
                )}
                <button
                  onClick={() => toggleAudio()}
                  className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 border-2 ${
                    isAudioEnabled
                      ? "bg-linear-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-green-400/50 shadow-lg hover:shadow-green-500/50"
                      : "bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-red-400/50 shadow-lg hover:shadow-red-500/50"
                  }`}
                  title={
                    isAudioEnabled ? "Mute microphone" : "Unmute microphone"
                  }
                >
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity group-hover:bg-white"></div>
                  {isAudioEnabled ? (
                    <FaMicrophone className="w-5 h-5 text-white relative z-10" />
                  ) : (
                    <FaMicrophoneSlash className="w-5 h-5 text-white relative z-10" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* active call ui */}
          {shouldShowActiveCall && (
            <div className="relative w-full h-full bg-linear-to-br from-gray-900 via-gray-950 to-black">
              {callType === "video" && (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${
                    remoteStream ? "block" : "hidden"
                  }`}
                />
              )}

              {/* Avatar/status display when no remote stream */}
              {(!remoteStream && callType === "video") ||
              callType !== "video" ? (
                <div className="w-full h-full bg-linear-to-br from-purple-900/30 via-gray-900 to-gray-950 flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative w-48 h-48 mx-auto mb-8">
                      <div className="absolute inset-0 bg-linear-to-br from-purple-500 to-pink-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                      <div className="relative w-48 h-48 rounded-full bg-linear-to-br from-gray-400 to-gray-600 overflow-hidden border-4 border-purple-400 shadow-xl">
                        <img
                          src={displayInfo?.avatar || backUserPic}
                          alt={displayInfo?.name || "User"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <p className="text-white text-2xl font-semibold mb-3">
                      {displayInfo?.name || "User"}
                    </p>
                    <div className="inline-block px-6 py-2 bg-linear-to-r from-purple-500 to-pink-500 rounded-full">
                      <p className="text-white text-sm font-medium">
                        {callStatus === "calling"
                          ? `📞 Calling ${displayInfo?.name}...`
                          : callStatus === "connecting"
                          ? "🔄 Connecting..."
                          : callStatus === "connected"
                          ? "✓ Connected"
                          : callStatus === "failed"
                          ? "❌ Connection Failed"
                          : displayInfo?.name}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* local video (picture in picture) */}
              {callType === "video" && (
                <div className="absolute top-6 right-6 w-56 h-40 bg-gray-900 rounded-2xl overflow-hidden border-4 border-purple-400 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                    You
                  </div>
                </div>
              )}

              {/* Call duration and info */}
              <div className="absolute top-6 left-6">
                <div className="backdrop-blur-md bg-black/40 border border-purple-400/50 rounded-full px-6 py-3 shadow-lg">
                  <p className="text-white font-semibold text-sm">
                    {callStatus === "connected" ? "✓ Connected" : callStatus}
                  </p>
                </div>
              </div>

              {/* call controls */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center space-x-4 bg-black/40 backdrop-blur-md rounded-full px-6 py-4 border border-purple-400/30 shadow-xl">
                  {callType === "video" && (
                    <button
                      onClick={() => toggleVideo()}
                      className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 border-2 ${
                        isVideoEnabled
                          ? "bg-linear-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-green-400/50 shadow-lg hover:shadow-green-500/50"
                          : "bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-red-400/50 shadow-lg hover:shadow-red-500/50"
                      }`}
                    >
                      <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity group-hover:bg-white"></div>
                      {isVideoEnabled ? (
                        <FaVideo className="w-6 h-6 text-white relative z-10" />
                      ) : (
                        <FaVideo
                          className="w-6 h-6 text-white relative z-10"
                          style={{ opacity: 0.5 }}
                        />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => toggleAudio()}
                    className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 border-2 ${
                      isAudioEnabled
                        ? "bg-linear-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-green-400/50 shadow-lg hover:shadow-green-500/50"
                        : "bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-red-400/50 shadow-lg hover:shadow-red-500/50"
                    }`}
                  >
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity group-hover:bg-white"></div>
                    {isAudioEnabled ? (
                      <FaMicrophone className="w-6 h-6 text-white relative z-10" />
                    ) : (
                      <FaMicrophoneSlash className="w-6 h-6 text-white relative z-10" />
                    )}
                  </button>

                  <div className="w-px h-8 bg-purple-500/30"></div>

                  <button
                    onClick={handleEndCall}
                    className="group relative w-14 h-14 bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-red-500/50 border-2 border-red-400/50"
                  >
                    <div className="absolute inset-0 rounded-full bg-red-500 opacity-0 group-hover:opacity-20 blur-md transition-opacity"></div>
                    <FaPhoneSlash className="w-6 h-6 relative z-10" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* close button for calling state */}
          {callStatus === "calling" && (
            <button
              onClick={handleEndCall}
              className="absolute top-6 right-6 w-12 h-12 bg-gray-700/80 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 shadow-lg border border-gray-500/50 backdrop-blur-sm"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default VideoCallModel;
