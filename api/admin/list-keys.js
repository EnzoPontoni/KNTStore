import jwt from 'jsonwebtoken';
import { readKeys, getKeyStats } from '../../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  // 1. Verificar o token de autenticação
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

  try {
    const keys = await readKeys();
    const stats = await getKeyStats();
    
    const now = new Date();
    const processedKeys = keys.map(key => {
      const isUsed = key.used === 'true';
      // A chave é considerada expirada APENAS SE não tiver sido usada e a data de expiração passou.
      const isExpired = !isUsed && (new Date(key.expiresAt) < now);
      
      let definitiveStatus = 'available'; // O status padrão é 'disponível'

      if (isUsed) {
        definitiveStatus = 'used'; // Se foi usada, o status é 'usada'. Isso tem prioridade máxima.
      } else if (isExpired) {
        definitiveStatus = 'expired'; // Se não foi usada E expirou, o status é 'expirada'.
      }

      // **MUDANÇA PRINCIPAL AQUI**
      // Removemos as propriedades 'used' e 'expired' antigas para evitar confusão no frontend.
      // O objeto final terá apenas o campo 'status' como fonte da verdade.
      const { used, expired, ...restOfKey } = key; 

      return {
        ...restOfKey,
        status: definitiveStatus, // Adiciona o campo de status claro e inequívoco
      };
    });

    const { status: filterStatus, limit = 50 } = req.query;
    let filteredKeys = processedKeys;

    if (filterStatus && filterStatus !== 'all') {
      filteredKeys = processedKeys.filter(k => k.status === filterStatus);
    }

    const limitedKeys = filteredKeys.slice(0, parseInt(limit));

    return res.status(200).json({
      success: true,
      keys: limitedKeys,
      stats,
      total: filteredKeys.length,
      showing: limitedKeys.length
    });

  } catch (error) {
    console.error('Erro ao listar keys:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao listar as chaves.'
    });
  }
}