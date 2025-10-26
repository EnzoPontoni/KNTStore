import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método não permitido' });

  // 1. Obter credenciais do corpo da requisição
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Nome de usuário e senha são obrigatórios.'
    });
  }

  // 2. Comparar com as credenciais seguras
  // Em uma aplicação real, estas credenciais estariam em variáveis de ambiente
  const ADMIN_USER = process.env.ADMIN_USER || 'kntadmin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'KntStore2025#Admin';
  const JWT_SECRET = process.env.JWT_SECRET || 'knt-ultra-secret-jwt-key-2025';

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    // 3. Se as credenciais estiverem corretas, gerar um token JWT
    const token = jwt.sign(
      { user: username, admin: true },
      JWT_SECRET,
      { expiresIn: '8h' } // O token expira em 8 horas
    );

    return res.status(200).json({
      success: true,
      token,
      message: 'Login realizado com sucesso.'
    });
  }

  // 4. Se as credenciais estiverem incorretas, retornar erro após um pequeno atraso
  // Isso ajuda a dificultar ataques de força bruta.
  await new Promise(resolve => setTimeout(resolve, 1000));

  return res.status(401).json({
    success: false,
    message: 'Credenciais inválidas. Verifique o usuário e a senha.'
  });
}

