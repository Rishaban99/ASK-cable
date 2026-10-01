import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  req.userId = 'default';
  req.userEmail = 'admin@askcable.lk';
  next();
}
