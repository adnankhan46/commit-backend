import { Router } from "express";
import { signupController, loginController, sendInviteController } from "./auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { protect } from "../../middlewares/auth.js";
import { signupSchema, loginSchema, sendInviteSchema } from "./auth.validator.js";
import { signInLimiter } from "../../middlewares/rateLimiter.js";

const router: Router = Router();

router.post("/signup", signInLimiter, validate(signupSchema), signupController);
router.post("/login", signInLimiter, validate(loginSchema), loginController);
router.post("/invite/send", protect, validate(sendInviteSchema), sendInviteController);

export default router;
