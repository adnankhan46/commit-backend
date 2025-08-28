import { Router } from "express";

// import all routes
import authRoutes from "./auth.routes.js"
import userRoutes from "./user.routes.js"

const router: Router = Router();

router.use("/api/v1/auth", authRoutes);
router.use("/api/v1/user", userRoutes);

export default router;
