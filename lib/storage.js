import { kv } from '@vercel/kv';
import { randomBytes } from 'crypto';

// --- FUNÇÕES DE GERAÇÃO E MANIPULAÇÃO DE CHAVES ---

/**
 * Gera um ID de chave único no formato KNT-XXXX-XXXX-XXXX-XXXX.
 * @returns {string} A nova chave gerada.
 */
export function generateKeyId() {
  const segment = () => randomBytes(2).toString('hex').toUpperCase();
  return `KNT-${segment()}-${segment()}-${segment()}-${segment()}`;
}

// --- FUNÇÕES DE INTERAÇÃO COM O BANCO DE DADOS (VERCEL KV) ---

const KEY_PREFIX = 'key:';
const CONFIG_KEY = 'product:config'; // Chave única para salvar as configurações

/**
 * Adiciona uma nova chave ao banco de dados.
 * @param {object} keyData - Os dados da chave a serem salvos.
 * @returns {Promise<void>}
 */
export async function addKey(keyData) {
  if (!keyData || !keyData.key) {
    throw new Error('Dados da chave ou a própria chave são inválidos.');
  }
  await kv.hset(`${KEY_PREFIX}${keyData.key}`, keyData);
}

/**
 * Encontra uma chave específica no banco de dados.
 * @param {string} key - A chave a ser procurada.
 * @returns {Promise<object|null>} Os dados da chave ou null se não for encontrada.
 */
export async function findKey(key) {
  return await kv.hgetall(`${KEY_PREFIX}${key}`);
}

/**
 * Atualiza os dados de uma chave existente.
 * @param {string} key - A chave a ser atualizada.
 * @param {object} dataToUpdate - Um objeto com os campos a serem atualizados.
 * @returns {Promise<void>}
 */
export async function updateKey(key, dataToUpdate) {
  await kv.hset(`${KEY_PREFIX}${key}`, dataToUpdate);
}

/**
 * Deleta uma chave do banco de dados.
 * @param {string} key - A chave a ser deletada.
 * @returns {Promise<number>} O número de chaves deletadas (0 ou 1).
 */
export async function deleteKey(key) {
  return await kv.del(`${KEY_PREFIX}${key}`);
}

/**
 * Lê todas as chaves do banco de dados.
 * @returns {Promise<object[]>} Uma lista de todas as chaves.
 */
export async function readKeys() {
  const keys = [];
  for await (const key of kv.scanIterator({ match: `${KEY_PREFIX}*` })) {
    const keyData = await kv.hgetall(key);
    if (keyData) {
      keys.push(keyData);
    }
  }
  return keys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Calcula e retorna estatísticas sobre as chaves.
 * @returns {Promise<object>} Um objeto com as estatísticas.
 */
export async function getKeyStats() {
    const allKeys = await readKeys();
    const now = new Date();
    
    let usedCount = 0;
    let expiredCount = 0;
    
    allKeys.forEach(k => {
        const isExpired = new Date(k.expiresAt) < now;
        if (k.used === 'true') {
            usedCount++;
        } else if (isExpired) {
            expiredCount++;
        }
    });

    const total = allKeys.length;
    const available = total - usedCount - expiredCount;

    return {
        total,
        used: usedCount,
        available,
        expired: expiredCount
    };
}

// --- NOVAS FUNÇÕES PARA CONFIGURAÇÃO DO PRODUTO ---

/**
 * Salva as configurações do produto (título e preço).
 * @param {object} configData - O objeto de configuração.
 * @returns {Promise<void>}
 */
export async function saveConfig(configData) {
  if (!configData || !configData.title || !configData.price) {
    throw new Error('Dados de configuração inválidos.');
  }
  await kv.hset(CONFIG_KEY, configData);
}

/**
 * Carrega as configurações do produto.
 * @returns {Promise<object|null>} Os dados de configuração ou null se não existirem.
 */
export async function loadConfig() {
  return await kv.hgetall(CONFIG_KEY);
}
