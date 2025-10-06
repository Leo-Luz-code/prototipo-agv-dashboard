import { getStatusFromAGV } from "../services/agvService.js";

export function getStatus(req, res) {
  res.json(getStatusFromAGV());
}
