import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = user;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
};
