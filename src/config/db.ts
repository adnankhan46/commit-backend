import mongoose from "mongoose";
import logger from "../utils/logger.js";
import config from "./env.js";

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO as string);
    // console.log(" MongoDB connected");
      logger.info(`[DB]: MongoDB Connected`);

  } catch (err) {
    // console.error(" MongoDB connection failed:", err);
      logger.error(`[DB err]: MongoDB connection failed: ${err}`);
    
    process.exit(1);
  }
};

export default connectDB;
