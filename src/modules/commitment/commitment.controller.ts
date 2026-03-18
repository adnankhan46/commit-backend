import type { NextFunction, Request, Response } from "express";
import * as commitmentService from "./commitment.service.js";
import { BadRequestError, NotFoundError } from "../../utils/CustomError.js";

export const createCommitmentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const commitment = await commitmentService.createCommitment(req.user!.id, req.body);
    res.status(201).json(commitment);
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};

export const getMyCommitmentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await commitmentService.getMyCommitments(req.user!.id);
    res.json(data);
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};

export const getCommitmentByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await commitmentService.getCommitmentById(req.params.id!, req.user!.id);
    res.json(data);
  } catch (err) {
    next(new NotFoundError((err as Error).message));
  }
};

export const cancelCommitmentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await commitmentService.cancelCommitment(req.params.id!, req.user!.id);
    res.json({ message: "Commitment cancelled successfully." });
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};

export const getCommitmentRowsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rows = await commitmentService.getCommitmentRows(
      req.params.id!,
      req.user!.id,
      req.query.userId as string | undefined,
      req.query.date as string | undefined
    );
    res.json(rows);
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};

export const submitStoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) return next(new BadRequestError("Image file is required"));
    const result = await commitmentService.submitStory(
      req.params.id!,
      req.params.rowId!,
      req.user!.id,
      req.file
    );
    res.json(result);
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};
