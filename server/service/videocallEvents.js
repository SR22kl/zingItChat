const handleVideoCallEvent = (socket, io, onlineUsers) => {
  //initiate videocall

  socket.on(
    "initiate_call",
    ({ callerId, receiverId, callType, callerInfo }) => {
      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        const callId = `${callerId}-${receiverId}-${Date.now()}`;
        io.to(receiverSocketId).emit("incoming_call", {
          callId,
          callerId,
          callType,
          callerName: callerInfo.userName,
          callerAvatar: callerInfo.profilePicture,
        });
      } else {
        console.log(`server: Receiver ${receiverId} is offline`);
        socket.emit("call_rejected", { reason: "User is offline" });
      }
    }
  );

  //Accept videocall

  socket.on("accept_call", (payload) => {
    const { callerId, callId } = payload || {};
    // Accept both correct and misspelled payload keys to remain tolerant to clients
    const receiverInfo = payload?.receiverInfo || payload?.recieverInfo || null;

    const callerSocketId = onlineUsers.get(callerId);

    if (callerSocketId) {
      // Guard against undefined receiverInfo to avoid runtime errors
      if (receiverInfo) {
        io.to(callerSocketId).emit("call_accepted", {
          callId,
          receiverName: receiverInfo.userName,
          receiverAvatar: receiverInfo.profilePicture,
        });
      } else {
        // Emit at least the callId so caller can proceed or handle missing receiver data
        io.to(callerSocketId).emit("call_accepted", { callId });
      }
    } else {
      console.log(`server: caller ${callerId} not found `);
    }
  });

  //Reject videocall
  socket.on("reject_call", ({ callerId, callId }) => {
    const callerSocketId = onlineUsers.get(callerId);

    if (callerSocketId) {
      io.to(callerSocketId).emit(
        "call_rejected",
        { callId },
        { reason: "Call rejected" }
      );
    } else {
      console.log(`server: Receiver ${callerId} is offline`);
    }
  });

  //End videocall
  socket.on("end_call", ({ participantId, callId }) => {
    const participantSocketId = onlineUsers.get(participantId);
    if (participantSocketId) {
      io.to(participantSocketId).emit("call_ended", { callId });
    }
  });

  //webRTC signaling even with proper userId
  socket.on("webrtc_offer", ({ offer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_offer", {
        offer,
        senderId: socket.userId,
        callId,
      });
      console.log(`server offer forworded to ${receiverId}`);
    } else {
      console.log(`server: Receiver ${receiverId} not found the offer`);
    }
  });

  //webRTC answer event
  socket.on("webrtc_answer", ({ answer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_answer", {
        answer,
        senderId: socket.userId,
        callId,
      });
      console.log(`server: answer forwarded to ${receiverId}`);
    } else {
      console.log(`server: Receiver ${receiverId} not found the answer`);
    }
  });

  //webRTC ICE candidate event
  socket.on("webrtc_ice_candidate", ({ candidate, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_ice_candidate", {
        candidate,
        senderId: socket.userId,
        callId,
      });
      console.log(`server: ice candidate forwarded to ${receiverId}`);
    } else {
      console.log(`server: Receiver ${receiverId} not found the ice candidate`);
    }
  });
};

export default handleVideoCallEvent;
