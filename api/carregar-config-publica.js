// CORREÇÃO: O caminho foi ajustado para o caminho relativo correto.
import { loadConfig } from '../lib/storage.js';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }
  
  // NOVO: Verifica se há um parâmetro 'type' na URL (ex: /api/carregar-config-publica?type=reseller)
  const { type } = req.query;

  try {
    const configData = await loadConfig();
    
    // Valores padrão caso não haja configuração no banco
    const defaultConfig = {
      productTitle: 'Passe de Batalha Free Fire',
      productPrice: 19.99,
      productResellerPrice: 15.99
    };

    // Define o título e os preços a partir do banco ou dos valores padrão
    const title = configData?.title || defaultConfig.productTitle;
    const price = configData?.price || defaultConfig.productPrice;
    const resellerPrice = configData?.resellerPrice || defaultConfig.productResellerPrice;
    
    // NOVO: Decide qual preço retornar com base no parâmetro 'type'
    const priceToReturn = type === 'reseller' ? resellerPrice : price;
    
    return res.status(200).json({
        success: true,
        data: {
            productTitle: title,
            productPrice: priceToReturn // Retorna o preço correto
        }
    });
  } catch (error) {
    console.error('Erro ao carregar configuração pública:', error);
    return res.status(500).json({ success: false, message: 'Erro interno ao carregar a configuração.' });
  }
}
