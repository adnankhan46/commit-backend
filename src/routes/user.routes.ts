import { Router } from "express";
import { getUser } from "../controllers/user.controller.js";

const router: Router = Router();

router.get("/getUser/:id", getUser);

export default router;
