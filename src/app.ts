import express, { type Application, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import morgan from "morgan";

import { ApiError, ErrorType } from "./utils/ApiError.js";
import { InternalError, NotFoundError } from "./utils/CustomError.js";

//config
import config from "./config/env.js";
import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

// central routes file
import routes from "./routes/index.js"

const app: Application = express();

// db
connectDB();

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.use("/", routes);

// test routes
app.get("/hello", (_, res: Response) => { res.json({ message: "Hello from Commit" }); });

// route not found
app.use((_req: Request, res: Response) => { throw new NotFoundError });

// Error Handler
app.use((err:Error, req:Request, res: Response, next: NextFunction)=>{
  if(err instanceof ApiError){
    ApiError.handle(err, res)

    if(err.type === ErrorType.INTERNAL){
      logger.error(`
        500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}
        `)
    } else {
      logger.error(`
        500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}
        `)
      }
      logger.error(err.stack)

      if(config.ENVIRONMENT){
        res.status(500).json({
          message: err.message, stack: err.stack
        })
      }
      ApiError.handle(new InternalError(), res)
  }
})

export default app;