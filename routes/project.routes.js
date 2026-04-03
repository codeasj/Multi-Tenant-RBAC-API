import express from "express";
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { adminAndAbove, memberAndAbove } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(protect); // all routes protected

router.get("/", getProjects);                           // all roles
router.get("/:id", getProject);                        // all roles
router.post("/", memberAndAbove, createProject);       // member+
router.put("/:id", memberAndAbove, updateProject);     // member+
router.delete("/:id", adminAndAbove, deleteProject);   // admin+

export default router;