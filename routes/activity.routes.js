import express from "express";
import { getActivityLogs } from "../controllers/activity.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { adminAndAbove } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/", protect, adminAndAbove, getActivityLogs); // admin+ only

export default router;
