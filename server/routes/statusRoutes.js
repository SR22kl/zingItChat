import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createStatus,
  deleteStatus,
  getStatuses,
  viewStatus,
} from "../controllers/statusController.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";

const statusRouter = express.Router();

// Route to create a status
// create status- /api/status/create
statusRouter.post("/create", authMiddleware, multerMiddleware, createStatus);

//get statuses- /api/status/get
statusRouter.get("/get", authMiddleware, getStatuses);

// view status- /api/status/view/:statusId
statusRouter.put("/view/:statusId", authMiddleware, viewStatus);

// delete status- /api/status/delete/:statusId
statusRouter.delete("/delete/:statusId", authMiddleware, deleteStatus);

export default statusRouter;
