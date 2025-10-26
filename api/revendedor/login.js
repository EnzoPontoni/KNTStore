import jwt from 'jsonwebtoken';
import { loadConfig } from '../../lib/storage.js';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Adiciona cabeçalhos para prevenir o cache da API
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Senha é obrigatória.' });
    }

    const config = await loadConfig();
    const savedPassword = config?.resellerPassword;
    const JWT_SECRET = process.env.JWT_SECRET || 'knt-ultra-secret-jwt-key-2025';

    // ***** LOGS DE DEPURAÇÃO ADICIONADOS *****
    // Estes logs aparecerão no painel da Vercel (Functions -> Logs)
    console.log('--- DEBUG REVENDEDOR LOGIN ---');
    console.log('Senha recebida do frontend:', `"${password}"`);
    console.log('Senha salva no banco de dados:', `"${savedPassword}"`);
    console.log('As senhas são iguais? (comparando com trim):', savedPassword && typeof password === 'string' && password.trim() === savedPassword.trim());
    console.log('-----------------------------');

    if (savedPassword && typeof password === 'string' && password.trim() === savedPassword.trim()) {
      const token = jwt.sign({ reseller: true }, JWT_SECRET, { expiresIn: '8h' });
      return res.status(200).json({ success: true, token });
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ success: false, message: 'Senha inválida.' });
    }

  } catch (error)
  {
    console.error('Erro na autenticação de revendedor:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
}

