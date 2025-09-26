import { Router } from "express";
const router = Router();
import { getStatus } from "../controllers/dataController";
import { generateRoute } from "../controllers/routeController";

router.get("/status", getStatus);
router.post("/route", generateRoute);

export default router;
