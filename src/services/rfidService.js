import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RFID_DB_PATH = path.join(__dirname, '../../data/rfid-tags.json');

// Estrutura: { "tag_id": { name: "Nome do Item", createdAt: timestamp, updatedAt: timestamp } }
let rfidDatabase = {};

/**
 * Inicializa o banco de dados de tags RFID
 */
function initDatabase() {
  try {
    // Cria o diretório data se não existir
    const dataDir = path.dirname(RFID_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Carrega o banco de dados se existir
    if (fs.existsSync(RFID_DB_PATH)) {
      const data = fs.readFileSync(RFID_DB_PATH, 'utf8');
      rfidDatabase = JSON.parse(data);
      console.log(`[RFID SERVICE] ✅ Banco de dados carregado: ${Object.keys(rfidDatabase).length} tags`);
    } else {
      // Cria arquivo vazio
      saveDatabase();
      console.log('[RFID SERVICE] 📝 Banco de dados criado');
    }
  } catch (error) {
    console.error('[RFID SERVICE] ❌ Erro ao inicializar banco de dados:', error);
    rfidDatabase = {};
  }
}

/**
 * Salva o banco de dados no arquivo
 */
function saveDatabase() {
  try {
    fs.writeFileSync(RFID_DB_PATH, JSON.stringify(rfidDatabase, null, 2));
    console.log('[RFID SERVICE] 💾 Banco de dados salvo');
  } catch (error) {
    console.error('[RFID SERVICE] ❌ Erro ao salvar banco de dados:', error);
  }
}

/**
 * Cadastra uma nova tag RFID com um nome de item
 */
export function registerTag(tagId, itemName) {
  if (!tagId || !itemName) {
    throw new Error('Tag ID e nome do item são obrigatórios');
  }

  const now = Date.now();
  rfidDatabase[tagId] = {
    name: itemName,
    createdAt: now,
    updatedAt: now
  };

  saveDatabase();
  console.log(`[RFID SERVICE] ✅ Tag cadastrada: ${tagId} -> ${itemName}`);
  return rfidDatabase[tagId];
}

/**
 * Obtém informações de uma tag pelo ID
 */
export function getTagInfo(tagId) {
  return rfidDatabase[tagId] || null;
}

/**
 * Obtém todas as tags cadastradas
 */
export function getAllTags() {
  return Object.entries(rfidDatabase).map(([tagId, data]) => ({
    tagId,
    ...data
  }));
}

/**
 * Renomeia um item associado a uma tag
 */
export function renameTag(tagId, newName) {
  if (!rfidDatabase[tagId]) {
    throw new Error('Tag não encontrada');
  }

  if (!newName) {
    throw new Error('Novo nome é obrigatório');
  }

  rfidDatabase[tagId].name = newName;
  rfidDatabase[tagId].updatedAt = Date.now();

  saveDatabase();
  console.log(`[RFID SERVICE] ✏️ Tag renomeada: ${tagId} -> ${newName}`);
  return rfidDatabase[tagId];
}

/**
 * Deleta uma tag cadastrada
 */
export function deleteTag(tagId) {
  if (!rfidDatabase[tagId]) {
    throw new Error('Tag não encontrada');
  }

  const deletedTag = rfidDatabase[tagId];
  delete rfidDatabase[tagId];

  saveDatabase();
  console.log(`[RFID SERVICE] 🗑️ Tag deletada: ${tagId}`);
  return deletedTag;
}

/**
 * Verifica se uma tag existe
 */
export function tagExists(tagId) {
  return !!rfidDatabase[tagId];
}

// Inicializa ao carregar o módulo
initDatabase();
