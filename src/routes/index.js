const express = require("express");
const router = express.Router();
const dataController = require("../controllers/dataController");
const routeController = require("../controllers/routeController");

router.get("/status", dataController.getStatus);
router.post("/route", routeController.generateRoute);

module.exports = router;
