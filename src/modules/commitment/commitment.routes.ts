import { Router } from "express";
import multer from "multer";
import {
  createCommitmentController,
  getMyCommitmentsController,
  getCommitmentByIdController,
  cancelCommitmentController,
  getCommitmentRowsController,
  submitStoryController,
} from "./commitment.controller.js";
import { validate } from "../../middlewares/validate.js";
import { createCommitmentSchema } from "./commitment.validator.js";

const router: Router = Router();

// 10 MB file size limit, memory storage (buffer passed to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

router.post("/", validate(createCommitmentSchema), createCommitmentController);
router.get("/", getMyCommitmentsController);
router.get("/:id", getCommitmentByIdController);
router.patch("/:id/cancel", cancelCommitmentController);
router.get("/:id/rows", getCommitmentRowsController);
router.post("/:id/rows/:rowId/submit", upload.single("image"), submitStoryController);

export default router;
