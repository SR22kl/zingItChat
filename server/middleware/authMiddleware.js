import jwt from "jsonwebtoken";
import response from "../utils/resHandler.js";

const authMiddleware = (req, res, next) => {
  // const authToken = req.cookies?.token;

  // if (!authToken) {
  //   return response(
  //     res,
  //     401,
  //     "Authentication token is missing, please provide token."
  //   );
  // }

  const authHeader = req.headers("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return response(
      res,
      401,
      "Authentication token is missing, please provide token."
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    // console.log(req.user);
    next();
  } catch (error) {
    console.error("Error in authMiddleware:", error);
    return response(res, 401, "Invalid or expired authentication token.");
  }
};

export default authMiddleware;
