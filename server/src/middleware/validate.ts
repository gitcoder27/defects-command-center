import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", "), status: 400 });
      return;
    }
    next();
  };
}
