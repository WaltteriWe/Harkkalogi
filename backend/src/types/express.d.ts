import { AuthUser } from "./index.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

