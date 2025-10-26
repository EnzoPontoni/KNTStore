import jwt from 'jsonwebtoken';
import { loadConfig } from '../../lib/storage.js';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store'); // Prevenir cache

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  // 1. Autenticação do Admin
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

  // 2. Carregar os dados
  try {
    const configData = await loadConfig();
    
    // Define valores padrão se nada for encontrado
    const dataToSend = {
      productTitle: configData?.title || 'Passe de Batalha Free Fire',
      productPrice: configData?.price || 19.99,
      productResellerPrice: configData?.resellerPrice || 15.00,
      resellerPassword: configData?.resellerPassword || ''
    };

    return res.status(200).json({
        success: true,
        data: dataToSend
    });
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    return res.status(500).json({ success: false, message: 'Erro interno ao carregar as configurações.' });
  }
}
