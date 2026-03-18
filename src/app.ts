import express, { type Application, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import morgan from "morgan";

import { ApiError, ErrorType } from "./utils/ApiError.js";
import { InternalError, NotFoundError } from "./utils/CustomError.js";
import { connectDB } from "./db/index.js";
import logger from "./utils/logger.js";

// Module routes
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import walletRoutes from "./modules/wallet/wallet.routes.js";
import commitmentRoutes from "./modules/commitment/commitment.routes.js";
import { protect } from "./middlewares/auth.js";

const app: Application = express();

// DB
connectDB();

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => res.json({ ok: true, service: "commit-backend" }));

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", protect, userRoutes);
app.use("/api/v1/wallet", protect, walletRoutes);
app.use("/api/v1/commitment", protect, commitmentRoutes);

// 404
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError("Route not found"));
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    if (err.type === ErrorType.INTERNAL) {
      logger.error(`500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      logger.error(err.stack);
    }
    return ApiError.handle(err, res);
  }

  logger.error(`Unhandled: ${err.message} - ${req.originalUrl} - ${req.method}`);
  logger.error(err.stack);
  ApiError.handle(new InternalError(), res);
});

export default app;
