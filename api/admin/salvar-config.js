import jwt from 'jsonwebtoken';
import { saveConfig, loadConfig } from '../../lib/storage.js';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-control-allow-origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store'); // Prevenir cache

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método não permitido' });

  // 1. Autenticação do Admin
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, message: 'Token de autenticação necessário' });
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'knt-ultra-secret-jwt-key-2025';
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }

  // 2. Obter e validar os dados
  const { productTitle, productPrice, productResellerPrice, resellerPassword } = req.body;
  if (!productTitle || !productPrice || !productResellerPrice) {
    return res.status(400).json({ success: false, message: 'Título e os dois preços são obrigatórios.' });
  }
  
  const price = parseFloat(String(productPrice).replace(',', '.'));
  const resellerPrice = parseFloat(String(productResellerPrice).replace(',', '.'));
  if (isNaN(price) || price <= 0 || isNaN(resellerPrice) || resellerPrice <= 0) {
    return res.status(400).json({ success: false, message: 'Os preços devem ser números válidos e maiores que zero.' });
  }

  // 3. Salvar os dados
  try {
    const existingConfig = await loadConfig() || {};
    
    // Atualiza os dados mantendo os que já existiam
    const configData = {
      ...existingConfig,
      title: productTitle,
      price: price,
      resellerPrice: resellerPrice,
      resellerPassword: resellerPassword || ''
    };

    console.log('[LOG SALVAR-CONFIG] Salvando os seguintes dados:', configData);
    await saveConfig(configData); 
    
    return res.status(200).json({ success: true, message: 'Configurações salvas com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return res.status(500).json({ success: false, message: 'Erro interno ao salvar as configurações.' });
  }
}
