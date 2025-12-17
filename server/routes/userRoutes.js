import express from "express";
import userController from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";

const userRouter = express.Router();

// User routes
//send otp - /api/auth/send-otp
userRouter.post("/send-otp", userController.sendOtp);

//verify otp - /api/auth/verify-otp
userRouter.post("/verify-otp", userController.verifyOtp);

//logout - /api/auth/logout
userRouter.get("/logout", userController.logOut);

// Protected route
userRouter.put(
  "/update-profile",
  authMiddleware,
  multerMiddleware,
  userController.updateProfile
);

userRouter.get(
  "/check-auth",
  authMiddleware,
  userController.checkAuthenticated
);

userRouter.get("/users", authMiddleware, userController.getAllUsers);

export default userRouter;
