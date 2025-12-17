import jwt from "jsonwebtoken";
import response from "../utils/resHandler.js";

const socketMiddleware = (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return response(
      res,
      401,
      "Authentication token is missing, please provide token."
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    // console.log(req.user);
    next();
  } catch (error) {
    console.error("Error in authMiddleware:", error);
    return response(res, 401, "Invalid or expired authentication token.");
  }
};

export default socketMiddleware;
