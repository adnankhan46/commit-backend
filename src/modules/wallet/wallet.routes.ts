import { Router } from "express";
import {
  getWalletController,
  getTransactionsController,
  topupController,
} from "./wallet.controller.js";
import { validate } from "../../middlewares/validate.js";
import { topupSchema } from "./wallet.validator.js";

const router: Router = Router();

router.get("/", getWalletController);
router.get("/transactions", getTransactionsController);
router.post("/topup", validate(topupSchema), topupController);

export default router;
