import jwt from "jsonwebtoken";

const socketMiddleware = (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return next(
      new Error("Authentication token is missing, please provide token.")
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    console.error("Error in socketMiddleware:", error);
    return next(new Error("Invalid or expired authentication token."));
  }
};

export default socketMiddleware;
