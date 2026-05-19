import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Serve para adicionar o user ao request padrão do express
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
