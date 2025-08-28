import { IUser } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // set by auth middleware
    }
  }
}

/**
 * learning: in controllers, safely do:
  if (req.user) {
  console.log(req.user.phone);
}
 */