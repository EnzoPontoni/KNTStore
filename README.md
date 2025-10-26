# 🔑 Free Fire Pass - Entrega Instantânea (KntStore)

Este é o repositório do site de venda e resgate de passes de jogo Free Fire, focado em uma experiência de usuário rápida e na entrega instantânea da chave de resgate após o pagamento via PIX, ou no resgate do passe diretamente na conta do jogador usando uma chave pré-comprada.

O projeto utiliza o Vercel para hospedagem das funções Serverless (API) e o Mercado Pago para processamento de pagamentos PIX.

## ✨ Tecnologias Utilizadas

| Componente | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Frontend** | HTML, CSS Puro, JavaScript | Interface simples e responsiva com lógica de abas e gerenciamento de estado na própria página (`index.html`). |
| **Backend/API** | Vercel Serverless Functions | Funções Node.js para lidar com a lógica de negócios, como criação e verificação de pagamentos, e resgate de chaves. |
| **Pagamentos** | Mercado Pago SDK (`mercadopago`) | Integração para geração de QR Codes e Códigos PIX, e verificação do status de pagamento. |
| **Banco de Dados** | Upstash/Vercel KV (`@vercel/kv`) | Armazenamento de alta performance baseado em Redis para chaves de resgate e configurações do produto. |
| **Serviço Central**| API Externa (`kntstore.discloud.app`) | API de terceiros (mencionada nos códigos) que realiza o envio efetivo do passe para o ID do jogador. |

## 🚀 Configuração do Ambiente de Desenvolvimento

Para rodar este projeto localmente ou fazer deploy, siga os passos abaixo:

### 1\. Pré-requisitos

  * Node.js (versão 18+)
  * Conta no Vercel (para deploy e uso do Vercel KV)
  * Conta no Mercado Pago com credenciais de desenvolvedor
  * Vercel CLI (opcional, mas recomendado para desenvolvimento local)

<!-- end list -->

```bash
npm install -g vercel
```

### 2\. Instalação das Dependências

Acesse a pasta raiz do projeto e instale as dependências:

```bash
npm install
```

### 3\. Configuração das Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto (ou utilize o existente `.env.development.local`) e preencha-o com suas credenciais.

As chaves críticas são:

| Variável | Descrição | Fonte |
| :--- | :--- | :--- |
| `MERCADO_PAGO_ACCESS_TOKEN` | Chave de acesso para a API do Mercado Pago. | Painel de Desenvolvedor do Mercado Pago. |
| `KV_URL` | URL de conexão completa do Upstash/Vercel KV. | Painel do Vercel KV (ou Upstash). |
| `KV_REST_API_TOKEN` | Token de escrita do Vercel KV (ou Upstash). | Painel do Vercel KV (ou Upstash). |

Exemplo de `.env.local`:

```ini
# Variável do Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN="SEU_ACCESS_TOKEN_DO_MERCADO_PAGO"

# Variáveis do Vercel KV (Redis)
KV_URL="rediss://default:SEU_KV_TOKEN@SEU_KV_URL:6379"
KV_REST_API_TOKEN="SEU_KV_TOKEN"
# ... outras chaves KV e Vercel OIDC (se aplicável)
```

### 4\. Execução Local

Você pode usar o Vercel CLI para simular o ambiente de produção localmente e testar as funções Serverless:

```bash
vercel dev
```

O site estará acessível em `http://localhost:3000` (ou outra porta indicada).

## 📂 Estrutura do Projeto

O projeto é organizado da seguinte forma:

```
.
├── api/
│   ├── carregar-config-publica.js  # API para carregar preços/títulos na UI.
│   ├── criar-pagamento.js         # API para gerar o PIX (QR Code e Código Copia/Cola).
│   ├── enviar-passe.js            # API para o cliente resgatar a key (Uso Único).
│   ├── vendedores.js              # API para login e ações de revendedores.
│   └── verificar-pagamento.js     # API de polling para checar status do PIX.
├── lib/
│   └── storage.js                 # Funções utilitárias para interação com Vercel KV (CRUD de Keys e Configs).
├── index.html                     # Frontend principal do site.
├── package.json                   # Dependências do projeto.
└── .env.development.local         # Variáveis de ambiente.
```

## 📝 Documentação das APIs (Serverless Functions)

As APIs são construídas como Vercel Serverless Functions no diretório `/api`.

### 1\. `/api/carregar-config-publica`

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| **GET** | `/api/carregar-config-publica` | Carrega o título e o preço principal do produto. |
| **GET** | `/api/carregar-config-publica?type=reseller` | Carrega o título e o preço de revendedor (se configurado). |

### 2\. `/api/criar-pagamento`

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| **POST** | `/api/criar-pagamento` | Gera um novo pagamento PIX no Mercado Pago, retornando o QR Code e o Código Copia/Cola. |

**Resposta de Sucesso (201):**

```json
{
  "success": true,
  "paymentId": "ID_DA_REFERENCIA_EXTERNA",
  "qrCodeImage": "BASE64_DA_IMAGEM_PNG",
  "qrCodeCopy": "CODIGO_PIX_COPIA_E_COLA"
}
```

### 3\. `/api/verificar-pagamento`

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| **POST** | `/api/verificar-pagamento` | Verifica o status do pagamento via `external_reference`. Se aprovado, gera e retorna uma nova chave de resgate única. |

**Corpo da Requisição:**

```json
{
  "paymentId": "ID_DA_REFERENCIA_EXTERNA"
}
```

**Resposta de Aprovado (200):**

```json
{
  "status": "approved",
  "key": "KNT-XXXX-XXXX-XXXX-XXXX"
}
```

### 4\. `/api/enviar-passe` (Resgate de Chave pelo Cliente)

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| **POST** | `/api/enviar-passe` | Valida uma chave de resgate, chama a API externa de envio de passe e, em caso de sucesso, **deleta a chave do banco de dados** (uso único). |

**Corpo da Requisição:**

```json
{
  "key": "KEY_DE_RESGATE",
  "player_id": "ID_DO_JOGADOR_FF",
  "message": "Mensagem_opcional"
}
```

**Comportamento Chave:**

  * Se o envio for bem-sucedido: a chave é **permanentemente deletada** do KV.
  * Se a chave estiver expirada: ela é **deletada** e uma mensagem de erro é retornada.

### 5\. `/api/vendedores` (Ações de Revendedor)

Esta API gerencia o login de revendedores e suas ações (envio de passe avulso, adição de contas).

| Método | Ação (no body) | Header Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| **POST** | `login` | Nenhum | Autentica o vendedor com `seller_name` e `seller_key`. |
| **POST** | `send-pass` | `Authorization: Bearer [key]` | Envia um passe diretamente para o `player_id` usando a API externa (requer chave válida). |
| **POST** | `add-account-single` | `Authorization: Bearer [key]` | Adiciona uma única conta (`uid`, `password`) ao sistema principal. |
| **POST** | `add-accounts-bulk` | `Authorization: Bearer [key]` | Processa um arquivo de contas em massa (`fileContent`). |

-----
