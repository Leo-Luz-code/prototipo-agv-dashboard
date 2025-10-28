import { Router } from "express";
import {
  registerTag,
  getTagInfo,
  getAllTags,
  renameTag,
  deleteTag,
  tagExists
} from "../services/rfidService.js";

const router = Router();

/**
 * GET /api/rfid/tags
 * Retorna todas as tags cadastradas
 */
router.get("/tags", (req, res) => {
  try {
    const tags = getAllTags();
    res.json({ success: true, tags });
  } catch (error) {
    console.error("[RFID ROUTES] Erro ao listar tags:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rfid/tags/:tagId
 * Retorna informações de uma tag específica
 */
router.get("/tags/:tagId", (req, res) => {
  try {
    const { tagId } = req.params;
    const tagInfo = getTagInfo(tagId);

    if (!tagInfo) {
      return res.status(404).json({ success: false, error: "Tag não encontrada" });
    }

    res.json({ success: true, tag: { tagId, ...tagInfo } });
  } catch (error) {
    console.error("[RFID ROUTES] Erro ao buscar tag:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rfid/tags
 * Cadastra uma nova tag
 * Body: { tagId: "ABC123", itemName: "Caixa de Peças" }
 */
router.post("/tags", (req, res) => {
  try {
    const { tagId, itemName } = req.body;

    if (!tagId || !itemName) {
      return res.status(400).json({
        success: false,
        error: "tagId e itemName são obrigatórios"
      });
    }

    if (tagExists(tagId)) {
      return res.status(409).json({
        success: false,
        error: "Tag já cadastrada. Use PUT para atualizar."
      });
    }

    const tag = registerTag(tagId, itemName);
    res.status(201).json({ success: true, tag: { tagId, ...tag } });
  } catch (error) {
    console.error("[RFID ROUTES] Erro ao cadastrar tag:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/rfid/tags/:tagId
 * Renomeia uma tag existente
 * Body: { itemName: "Novo Nome" }
 */
router.put("/tags/:tagId", (req, res) => {
  try {
    const { tagId } = req.params;
    const { itemName } = req.body;

    if (!itemName) {
      return res.status(400).json({
        success: false,
        error: "itemName é obrigatório"
      });
    }

    const tag = renameTag(tagId, itemName);
    res.json({ success: true, tag: { tagId, ...tag } });
  } catch (error) {
    console.error("[RFID ROUTES] Erro ao renomear tag:", error);

    if (error.message === "Tag não encontrada") {
      return res.status(404).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/rfid/tags/:tagId
 * Deleta uma tag cadastrada
 */
router.delete("/tags/:tagId", (req, res) => {
  try {
    const { tagId } = req.params;
    const deletedTag = deleteTag(tagId);
    res.json({ success: true, tag: { tagId, ...deletedTag } });
  } catch (error) {
    console.error("[RFID ROUTES] Erro ao deletar tag:", error);

    if (error.message === "Tag não encontrada") {
      return res.status(404).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
