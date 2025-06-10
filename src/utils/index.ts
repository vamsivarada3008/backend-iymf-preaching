import express, { Request, Response } from 'express';

export function asyncHandler(fn: (req: Request, res: Response) => Promise<any>) {
    return (req: Request, res: Response, next: express.NextFunction) => {
      fn(req, res).catch(next);
    };
  }