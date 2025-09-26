import { getStatus } from "../services/agvService";

export function getStatus(req, res) {
  res.json(getStatus());
}
