import { Router } from "express";
import {
  getMeController,
  updatePushTokenController,
  getUserByIdController,
} from "./user.controller.js";

const router: Router = Router();

router.get("/me", getMeController);
router.patch("/me", updatePushTokenController);
router.get("/:id", getUserByIdController);

export default router;
