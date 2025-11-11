import { Router } from "express";
import { getStatus } from "../controllers/dataController.js";
import { generateRoute } from "../controllers/routeController.js";
import rfidRoutes from "./rfidRoutes.js";
import { broadcast } from "../services/socketService.js";

const router = Router();

router.get("/status", getStatus);
router.post("/route", generateRoute);

// Rotas de gerenciamento de RFID
router.use("/rfid", rfidRoutes);

// Rota de teste para sensor de cor
router.post("/test/color", (req, res) => {
  const { color } = req.body;
  const testData = {
    color: color || "Vermelho",
    timestamp: Date.now()
  };

  console.log("[TEST ROUTE] 🧪 Enviando dados de teste de cor:", testData);
  broadcast("agv/color", testData);

  res.json({ success: true, data: testData });
});

export default router;
