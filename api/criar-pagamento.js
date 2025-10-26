// ATENÇÃO: Código atualizado para gerar pagamento PIX com o SDK v3
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { randomUUID } from 'crypto';
import { loadConfig } from '../lib/storage.js';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }
  
  // ***** CORREÇÃO PRINCIPAL AQUI *****
  // Garante que o código não quebre se o 'body' da requisição estiver vazio.
  const { type } = req.body || {};

  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('❌ ERRO CRÍTICO: MERCADO_PAGO_ACCESS_TOKEN não encontrado.');
      throw new Error('A chave de acesso do servidor não está configurada.');
    }

    // 1. Carrega as configurações do produto (título e preços) do banco de dados
    const configData = await loadConfig();
    const productTitle = configData?.title || 'Passe de Batalha Free Fire';
    
    const MINIMUM_TRANSACTION_AMOUNT = 1.00;
    
    // Escolhe o preço correto com base no 'type' recebido
    const priceFromDB = (type === 'reseller')
        ? String(configData?.resellerPrice || 15.00) // Usa o preço de revendedor
        : String(configData?.price || 19.99); // Usa o preço normal

    const cleanedPriceString = priceFromDB.replace(/[^0-9,.]/g, '').replace(',', '.');
    let productPrice = parseFloat(cleanedPriceString);

    if (isNaN(productPrice) || productPrice < MINIMUM_TRANSACTION_AMOUNT) {
        console.warn(`[AVISO] Preço inválido ou abaixo do mínimo. Usando o valor de R$ ${MINIMUM_TRANSACTION_AMOUNT.toFixed(2)}.`);
        productPrice = MINIMUM_TRANSACTION_AMOUNT;
    }

    // 2. Inicializa o cliente do Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: accessToken });
    const payment = new Payment(client);

    // 3. Gera um ID único para a transação
    const externalReference = randomUUID();

    // 4. Define a data de expiração para o QR Code (30 minutos a partir de agora)
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 30);

    // 5. Monta o corpo da requisição de pagamento PIX
    const paymentBody = {
      transaction_amount: productPrice,
      description: productTitle,
      payment_method_id: 'pix',
      payer: {
        email: `cliente-${Date.now()}@exemplo.com`,
      },
      external_reference: externalReference,
      date_of_expiration: expirationDate.toISOString().replace('Z', '-03:00'),
    };

    console.log(`[LOG] Criando PIX para "${productTitle}" (${type || 'normal'}) no valor de R$ ${paymentBody.transaction_amount.toFixed(2)}`);
    const response = await payment.create({ body: paymentBody });

    // 6. Verifica se a resposta contém os dados do QR Code
    if (response && response.point_of_interaction?.transaction_data) {
      const qrCodeData = response.point_of_interaction.transaction_data;
      
      console.log(`[LOG] Pagamento PIX criado com sucesso para o ID: ${externalReference}`);
      
      return res.status(201).json({ 
        success: true, 
        paymentId: externalReference,
        qrCodeImage: qrCodeData.qr_code_base64,
        qrCodeCopy: qrCodeData.qr_code,
      });
    } else {
      console.error('❌ ERRO: Resposta inesperada ao criar PIX:', response);
      throw new Error('Não foi possível obter os dados do QR Code do Mercado Pago.');
    }

  } catch (error) {
    console.error('❌ ERRO AO CRIAR PAGAMENTO PIX ❌');
    const errorMessage = error.cause ? JSON.stringify(error.cause) : error.message;
    console.error('Detalhes do Erro:', errorMessage);
    
    return res.status(500).json({
      success: false,
      message: 'Ocorreu um erro interno no servidor ao criar o pagamento.',
      error: errorMessage,
    });
  }
}
