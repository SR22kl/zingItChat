import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";

let socket = null;

const token = localStorage.getItem("auth_token");

export const initailizeSocket = () => {
  if (socket) {
    return socket;
  }

  const user = useUserStore.getState().user;

  //backend url
  const BACKEND_URL = import.meta.env.VITE_API_URL;

  socket = io(BACKEND_URL, {
    auth: { token },
    // withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // connection events
  // Use the client-side 'connect' event (not 'connection')
  socket.on("connect", () => {
    console.log("Connected to server", socket.id);
    try {
      if (user?._id) {
        socket.emit("user_connected", user._id);
      }
    } catch (e) {
      console.error("Failed to emit user_connected:", e);
    }
  });

  socket.on("connect_error", (error) => {
    console.error("socket connection error:", error);
  });

  //disconnected events
  socket.on("disconnect", (reason) => {
    console.log("socket disconnected", reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    socket = initailizeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
