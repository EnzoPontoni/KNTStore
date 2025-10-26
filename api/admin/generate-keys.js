import jwt from 'jsonwebtoken';
import { readKeys, addKey, generateKeyId } from '../../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de autenticação necessário' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'knt-ultra-secret-jwt-key-2025';
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }
  
  const { quantity = 1, expireDays = 30 } = req.body;

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return res.status(400).json({
      success: false,
      message: 'A quantidade deve ser um número inteiro entre 1 e 100.'
    });
  }

  try {
    const newKeys = [];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(expireDays));
    const existingKeys = await readKeys();

    for (let i = 0; i < quantity; i++) {
      let keyValue;
      let isUnique = false;
      
      while (!isUnique) {
        keyValue = generateKeyId();
        isUnique = !existingKeys.some(k => k.key === keyValue);
      }

      const keyData = {
        key: keyValue,
        used: 'false',
        expired: 'false',
        autoDelete: 'true', // <-- ADICIONADO: Marca a chave para ser deletada após o uso
        createdAt: new Date().toISOString(),
        expiresAt: expiryDate.toISOString(),
        usedAt: null,
        usedBy: null,
        usageCount: 0
      };

      await addKey(keyData);
      newKeys.push(keyValue);
      existingKeys.push(keyData);
    }

    return res.status(200).json({
      success: true,
      keys: newKeys,
      count: newKeys.length,
      expiresAt: expiryDate.toISOString(),
      message: `${quantity} key(s) de uso único gerada(s) com sucesso.`
    });

  } catch (error) {
    console.error('Erro ao gerar keys:', error);
    return res.status(500).json({
      success: false,
      message: 'Ocorreu um erro interno no servidor ao gerar as keys.'
    });
  }
}