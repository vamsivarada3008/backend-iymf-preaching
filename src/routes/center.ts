import { Router, Request, Response } from 'express';
import Center from '../models/Center';
import Location from '../models/Location';
import User from '../models/User';
import { asyncHandler } from '../utils';

const router = Router();

router.post('/add', asyncHandler(async (req: Request, res: Response) => {
  const location = new Location(req.body.location);
  const savedLocation = await location.save();
  const center = new Center({
    ...req.body,
    location: savedLocation._id,
  });
  const savedCenter = await center.save();
  return res.send(savedCenter);
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const centers = await Center.find({});
  return res.send(centers);
}));

router.get('/:centerId', asyncHandler(async (req: Request, res: Response) => {
  const center = await Center.findById(req.params.centerId);
  return res.send(center);
}));

router.post('/update/:centerId', asyncHandler(async (req: Request, res: Response) => {
  const updatedCenter = await Center.updateOne(
    { _id: req.params.centerId },
    { $set: req.body }
  );
  return res.send(updatedCenter);
}));

router.post('/delete/:centerId', asyncHandler(async (req: Request, res: Response) => {
  const removedCenter = await Center.deleteOne({ _id: req.params.centerId });
  return res.send(removedCenter);
}));

export default router;