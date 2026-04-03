import express from "express";
import {
  registerOrg,
  login,
  logout,
  inviteMember,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { adminAndAbove } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/register-org", registerOrg);
router.post("/login", login);
router.post("/logout", logout);
router.post("/invite", protect, adminAndAbove, inviteMember);

export default router;
