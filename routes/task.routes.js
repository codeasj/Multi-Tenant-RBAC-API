
import express from "express";
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { adminAndAbove, memberAndAbove } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getTasks);                          // all roles
router.get("/:id", getTask);                        // all roles
router.post("/", memberAndAbove, createTask);       // member+
router.put("/:id", memberAndAbove, updateTask);     // member+
router.delete("/:id", adminAndAbove, deleteTask);   // admin+

export default router;