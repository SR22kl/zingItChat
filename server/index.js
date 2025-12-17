import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import dbConnect from "./config/dbConnect.js";
import userRouter from "./routes/userRoutes.js";
import bodyParser from "body-parser";
import chatRouter from "./routes/chatRoutes.js";
import initailizeSocket from "./service/socketService.js";
import http from "http";
import cors from "cors";
import statusRouter from "./routes/statusRoutes.js";

dotenv.config();

// Connect to database
dbConnect();

const app = express();
const PORT = process.env.PORT || 4000;

// cors configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// Silence favicon requests (avoid 500s from missing favicon during debugging)
app.get(["/favicon.ico", "/favicon.png", "/favicon.svg"], (req, res) =>
  res.status(204).end()
);

// create server
const server = http.createServer(app);
const io = initailizeSocket(server);

//apply socket middleware to express app
app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

// Routes
app.use("/api/auth", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/status", statusRouter);

// Home route
app.use("/", (req, res) => res.send("Server is working!"));

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
