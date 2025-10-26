import { MercadoPagoConfig, Payment } from 'mercadopago';
// CORRIGIDO: O caminho agora aponta para o diretório correto (../ em vez de ../../)
import { addKey, generateKeyId, readKeys } from '../lib/storage.js';

// Função segura para criar a chave apenas uma vez e evitar duplicatas
async function findOrCreateKeyForPayment(paymentId) {
  // 1. Verifica se uma chave já foi gerada para este ID de pagamento
  const allKeys = await readKeys();
  const existingKey = allKeys.find(k => k.generatedByPaymentId === paymentId);

  if (existingKey) {
    // Se a chave já existe, apenas a retorna para garantir consistência
    console.log(`[LOG] Chave ${existingKey.key} já existe para o pagamento ${paymentId}.`);
    return existingKey.key;
  }

  // 2. Se não existe, cria uma nova chave
  console.log(`[LOG] Gerando nova chave para o pagamento aprovado ${paymentId}...`);
  const newKeyValue = generateKeyId();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 365); // Define a validade da chave para 1 ano

  const newKeyData = {
    key: newKeyValue,
    used: 'false',
    expired: 'false',
    autoDelete: 'true', // Mantém a lógica de auto-deleção após o uso
    createdAt: new Date().toISOString(),
    expiresAt: expiryDate.toISOString(),
    generatedByPaymentId: paymentId, // Linka a chave ao ID do pagamento que a gerou
  };

  // 3. Salva a nova chave no banco de dados
  await addKey(newKeyData);
  console.log(`[LOG] Nova chave ${newKeyValue} gerada e salva com sucesso.`);
  return newKeyValue;
}

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método não permitido' });

  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ status: 'failed', message: 'ID do pagamento é obrigatório.' });
    }

    // Configura o cliente do Mercado Pago
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Chave de acesso do servidor não configurada.');
    
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    // Busca o pagamento usando a `external_reference` que definimos
    console.log(`[LOG] Verificando status para external_reference: ${paymentId}`);
    const searchResult = await payment.search({ options: { external_reference: paymentId } });

    // Verifica se encontrou algum resultado
    if (searchResult?.results?.length > 0) {
      const paymentInfo = searchResult.results[0];
      
      // Se o status for 'aprovado', gera a chave e retorna
      if (paymentInfo.status === 'approved') {
        const gameKey = await findOrCreateKeyForPayment(paymentId);
        return res.status(200).json({ status: 'approved', key: gameKey });
      }
    }

    // Se não encontrou ou o status ainda não é 'aprovado', retorna 'pendente'
    return res.status(200).json({ status: 'pending' });

  } catch (error) {
    console.error('❌ ERRO AO VERIFICAR PAGAMENTO ❌', error);
    const errorMessage = error.cause ? JSON.stringify(error.cause) : error.message;
    return res.status(500).json({ status: 'failed', message: 'Erro interno do servidor.', error: errorMessage });
  }
}
