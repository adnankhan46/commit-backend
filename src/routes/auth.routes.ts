import { Router } from "express";
import { createUser } from "../controllers/auth.controller.js";
import { signInLimiter } from "../middlewares/rateLimiter.js";

const router: Router = Router();

router.post("/signin", signInLimiter ,createUser);
// delete user, logout user

export default router;
