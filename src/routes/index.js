import { Router } from "express";
import { getStatus } from "../controllers/dataController.js";
import { generateRoute } from "../controllers/routeController.js";
import rfidRoutes from "./rfidRoutes.js";

const router = Router();

router.get("/status", getStatus);
router.post("/route", generateRoute);

// Rotas de gerenciamento de RFID
router.use("/rfid", rfidRoutes);

export default router;
