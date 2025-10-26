// /api/enviar-passe.js - VERSÃO COM AUTO-DELETE (uso único)
import { findKey, deleteKey } from '../lib/storage.js';

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

  const { key, player_id, message = 'Booyah!' } = req.body;

  // Validação dos Dados de Entrada
  if (!key || !player_id) {
    return res.status(400).json({ success: false, message: 'Key e ID do jogador são obrigatórios' });
  }
  if (!/^\d{8,15}$/.test(player_id)) {
    return res.status(400).json({ success: false, message: 'ID do jogador inválido' });
  }
  if (!/^KNT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
    return res.status(400).json({ success: false, message: 'Formato de key inválido' });
  }

  try {
    console.log(`[LOG] Iniciando processo para a key: ${key} e player_id: ${player_id}`);

    // --- Passo 1: Buscar dados da key ---
    const keyData = await findKey(key);
    
    if (!keyData) {
      console.warn(`[AVISO] Key não encontrada no banco de dados: ${key}`);
      return res.status(404).json({ success: false, message: 'Key não encontrada ou inválida.' });
    }
    
    // --- Passo 2: Validar o status da key ---
    if (keyData.used === 'true') {
      console.warn(`[AVISO] Tentativa de uso de key já utilizada: ${key}`);
      return res.status(400).json({ success: false, message: `Esta key já foi utilizada.` });
    }
    if (new Date() > new Date(keyData.expiresAt)) {
      console.warn(`[AVISO] Tentativa de uso de key expirada: ${key}`);
      // Limpeza: Deleta a chave expirada do banco de dados
      await deleteKey(key);
      console.log(`[LOG] Key expirada ${key} foi deletada do sistema.`);
      return res.status(400).json({ success: false, message: 'Esta key expirou e foi removida.' });
    }

    // --- Passo 3: Chamar a API externa ---
    console.log('[LOG] Passo 3: Chamando a API externa para enviar o passe...');
    const SELLER_KEY = 'HScTOCHCqfnH';
    const API_URL = 'https://kntstore.discloud.app/api/enviar-passe';
    
    const payload = {
      seller_key: SELLER_KEY,
      player_id: parseInt(player_id),
      message: message
    };

    const apiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`[LOG] Passo 3.1: Resposta da API externa recebida com status: ${apiResponse.status}`);
    
    const apiData = await apiResponse.json();

    // --- Passo 4: Finalização do processo ---
    if (apiResponse.ok && apiData.code === 'SUCCESS') {
      // AÇÃO PRINCIPAL: Deleta a chave após o uso bem-sucedido
      console.log(`[LOG] Sucesso na API externa. Deletando a key ${key} de uso único...`);
      await deleteKey(key);
      console.log('[LOG] Key deletada. Processo finalizado com sucesso.');
      
      return res.status(200).json({
        success: true,
        message: 'Passe enviado e chave removida com sucesso!',
        data: apiData
      });
    } else {
      console.error('[ERRO] A API externa retornou um erro:', { status: apiResponse.status, data: apiData });
      return res.status(400).json({
        success: false,
        message: apiData.message || 'Erro ao contatar o servidor de envio.',
        error: apiData
      });
    }

  } catch (error) {
    // Bloco de erro detalhado para depuração
    console.error('❌ ERRO CRÍTICO NA EXECUÇÃO DA FUNÇÃO /api/enviar-passe ❌');
    console.error('Mensagem do Erro:', error.message);
    console.error('Stack do Erro:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Ocorreu um erro interno no servidor.',
      error: error.message
    });
  }
}