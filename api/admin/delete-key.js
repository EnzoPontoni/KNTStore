import jwt from 'jsonwebtoken';
import { deleteKey, findKey } from '../../lib/storage.js';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

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

  // 2. Obter a chave do corpo da requisição
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, message: 'Nenhuma key foi fornecida para exclusão' });
  }

  try {
    // 3. Garantir que a chave existe antes de tentar deletar
    const keyExists = await findKey(key);
    if (!keyExists) {
      return res.status(404).json({ success: false, message: 'A key que você tentou deletar não foi encontrada.' });
    }
    
    // 4. Deletar a chave do banco de dados
    await deleteKey(key);
    
    return res.status(200).json({
      success: true,
      message: `A key ${key} foi deletada com sucesso!`
    });

  } catch (error) {
    console.error(`Erro ao deletar a key ${key}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Ocorreu um erro interno no servidor ao tentar deletar a key.'
    });
  }
}

