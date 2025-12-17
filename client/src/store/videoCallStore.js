import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

const useVideoCallStore = create(
  subscribeWithSelector((set, get) => ({
    //call state
    currentCall: null,
    incomingCall: null,
    isCallActive: false,
    callType: null, // 'video' or 'audio'

    //media state
    localStream: null,
    remoteStream: null,
    isVideoEnabled: true,
    isAudioEnabled: true,

    //webRTC state
    peerConnection: null,
    iceCandidatesQueue: [], // Queue for ICE candidates

    isCallModalOpen: false,
    callStatus: "idle", // 'idle', 'calling', 'in-call', 'ended'
    socket: null,
    currentUser: null,

    //Actions
    setCurrentCall: (call) => set({ currentCall: call }),
    setIncomingCall: (call) => set({ incomingCall: call }),
    setIsCallActive: (active) => set({ isCallActive: active }),
    setCallType: (type) => set({ callType: type }),
    setLocalStream: (stream) => set({ localStream: stream }),
    setRemoteStream: (stream) => set({ remoteStream: stream }),
    setPeerConnection: (pc) => set({ peerConnection: pc }),
    setCallModalOpen: (open) => set({ isCallModalOpen: open }),
    setCallStatus: (status) => set({ callStatus: status }),
    setSocket: (socket) => set({ socket }),
    setCurrentUser: (user) => set({ currentUser: user }),
    addIceCandidate: (candidate) => {
      const { iceCandidatesQueue } = get();
      set({ iceCandidatesQueue: [...iceCandidatesQueue, candidate] });
    },
    processQueuedIceCandidates: async () => {
      const { peerConnection, iceCandidatesQueue } = get();

      if (
        peerConnection &&
        peerConnection.remoteDescription &&
        iceCandidatesQueue.length > 0
      ) {
        for (const candidate of iceCandidatesQueue) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } catch (error) {
            console.error("ICE candidate error:", error);
          }
        }
        set({ iceCandidatesQueue: [] }); // Clear the queue after processing
      }
    },

    toggleVideo: () => {
      const { localStream, isVideoEnabled } = get();
      if (localStream) {
        const videoTracks = localStream.getVideoTracks()[0];
        if (videoTracks) {
          videoTracks.enabled = !isVideoEnabled;
          set({ isVideoEnabled: !isVideoEnabled });
        }
      }
    },

    toggleAudio: () => {
      const { localStream, isAudioEnabled } = get();
      if (localStream) {
        const audioTracks = localStream.getAudioTracks()[0];
        if (audioTracks) {
          audioTracks.enabled = !isAudioEnabled;
          set({ isAudioEnabled: !isAudioEnabled });
        }
      }
    },

    endCall: () => {
      const { localStream, peerConnection } = get();

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      set({
        currentCall: null,
        incomingCall: null,
        isCallActive: false,
        callType: null,
        localStream: null,
        remoteStream: null,
        peerConnection: null,
        iceCandidatesQueue: [],
        isVideoEnabled: true,
        isAudioEnabled: true,
        isCallModalOpen: false,
        callStatus: "idle",
      });
    },

    initiateCall: (
      receiverId,
      receiverName,
      receiverAvatar,
      callType = "video"
    ) => {
      const { socket, currentUser } = get();

      if (!socket || !currentUser) {
        console.error("Socket or user not initialized for video call");
        return;
      }

      const callId = `${currentUser._id}-${receiverId}-${Date.now()}`;

      const callData = {
        callId,
        participantId: receiverId,
        participantName: receiverName,
        participantAvatar: receiverAvatar,
      };

      set({
        currentCall: callData,
        callType,
        isCallModalOpen: true,
        callStatus: "calling",
      });

      socket.emit("initiate_call", {
        callerId: currentUser._id,
        receiverId,
        callType,
        callerInfo: {
          userName: currentUser.userName,
          profilePicture: currentUser.profilePicture,
        },
      });
    },

    clearIncomingCall: () => set({ incomingCall: null }),
  }))
);

export default useVideoCallStore;
