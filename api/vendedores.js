import fetch from 'node-fetch';

// --- URLs DAS APIS PRINCIPAIS ---
const VENDEDORES_API_URL = 'https://kntstore.discloud.app/api/listar-vendedores?auth_key=Admin2025';
const ENVIAR_PASSE_API_URL = 'https://kntstore.discloud.app/api/enviar-passe';
const ADD_CONTA_API_URL = 'https://kntstore.discloud.app/api/adicionar-conta';


// --- FUNÇÕES DE LÓGICA (HANDLERS) ---

/**
 * Autentica um vendedor comparando suas credenciais com a lista da API principal.
 */
async function handleLogin(req) {
    const { seller_name, seller_key } = req.body;
    if (!seller_name || !seller_key) {
        throw new Error('Nome do vendedor e chave são obrigatórios.');
    }

    const response = await fetch(VENDEDORES_API_URL);
    if (!response.ok) {
        throw new Error('Não foi possível conectar ao servidor de autenticação.');
    }
    const data = await response.json();
    
    if (!data || !Array.isArray(data.sellers)) {
        console.error('Resposta inesperada da API de vendedores:', data);
        throw new Error('Formato de resposta inesperado da API de vendedores.');
    }

    const vendedorValido = data.sellers.find(
        v => v.seller_name === seller_name && v.key === seller_key
    );

    if (vendedorValido) {
        return { success: true, message: 'Login bem-sucedido!' };
    } else {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Previne ataques de força bruta
        throw new Error('Credenciais inválidas.');
    }
}

/**
 * Envia um passe para um jogador usando a API principal.
 */
async function handleSendPass(req, sellerKey) {
    const { player_id, message = 'Booyah!' } = req.body;
    if (!player_id) throw new Error('O ID do jogador é obrigatório.');

    const payload = { seller_key: sellerKey, player_id: parseInt(player_id), message };
    const apiResponse = await fetch(ENVIAR_PASSE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const apiData = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(apiData.message || 'Erro no servidor de envio.');
    return { success: true, message: 'Passe enviado com sucesso!', data: apiData };
}

/**
 * Adiciona uma única conta usando a API principal.
 */
async function handleAddAccountSingle(req, sellerKey) {
    const { uid, password } = req.body;
    if (!uid || !password) throw new Error('UID e Senha são obrigatórios.');

    const payload = { 
        seller_key: sellerKey, 
        uid: parseInt(uid.trim()), 
        password: password.trim() 
    };

    console.log(`[ADD-SINGLE] Enviando para kntstore:`, JSON.stringify(payload));
    const response = await fetch(ADD_CONTA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log(`[ADD-SINGLE] Resposta da kntstore - Status: ${response.status}, Corpo: ${responseText}`);
    
    let data;
    try { data = JSON.parse(responseText); } 
    catch (e) { throw new Error(`Resposta inválida do servidor principal: ${responseText}`); }

    if (response.status === 201 || (response.ok && data.code === 'ACCOUNT_ADDED')) {
         return { success: true, message: data.message || 'Conta adicionada com sucesso!' };
    } else {
        throw new Error(data.message || 'Erro desconhecido na API principal.');
    }
}

/**
 * Adiciona contas em massa a partir de um arquivo de texto.
 */
async function handleAddAccountsBulk(req, sellerKey) {
    const { fileContent } = req.body;
    if (!fileContent) throw new Error('Conteúdo do arquivo não recebido.');

    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 2000) throw new Error('O limite é de 2000 contas por vez.');

    let addedCount = 0;
    let errorCount = 0;

    for (const line of lines) {
        const parts = line.trim().split(/[;:\-_\/]/, 2);
        if (parts.length === 2) {
            const uid = parts[0].trim();
            const password = parts[1].trim();
            if (uid && password && /^\d+$/.test(uid)) {
                try {
                    // Reutiliza a função de adicionar conta única
                    await handleAddAccountSingle({ body: { uid, password } }, sellerKey);
                    addedCount++;
                } catch (e) {
                    console.error(`Erro em massa (UID: ${uid}): ${e.message}`);
                    errorCount++;
                }
            } else { errorCount++; }
        } else { errorCount++; }
        await new Promise(resolve => setTimeout(resolve, 300)); // Delay para não sobrecarregar a API
    }
    return { success: true, message: 'Arquivo processado.', added: addedCount, errors: errorCount };
}


// --- HANDLER PRINCIPAL (ROTEADOR) ---
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método não permitido' });

    const { action } = req.body;

    try {
        if (action === 'login') {
            const result = await handleLogin(req);
            return res.status(200).json(result);
        }

        // A partir daqui, todas as ações exigem uma chave de vendedor
        const sellerKey = req.headers.authorization?.replace('Bearer ', '');
        if (!sellerKey) {
            return res.status(401).json({ success: false, message: 'Chave do vendedor é necessária.' });
        }

        let result;
        switch (action) {
            case 'send-pass':
                result = await handleSendPass(req, sellerKey);
                break;
            case 'add-account-single':
                result = await handleAddAccountSingle(req, sellerKey);
                break;
            case 'add-accounts-bulk':
                result = await handleAddAccountsBulk(req, sellerKey);
                break;
            default:
                return res.status(400).json({ success: false, message: 'Ação inválida.' });
        }
        return res.status(200).json(result);

    } catch (error) {
        console.error(`❌ ERRO NA AÇÃO '${action}':`, error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
}

