import { Router } from "express";

const router = Router();
import { getStatus } from "../controllers/dataController.js";
import { generateRoute } from "../controllers/routeController.js";

router.get("/status", getStatus);
router.post("/route", generateRoute);

export default router;
