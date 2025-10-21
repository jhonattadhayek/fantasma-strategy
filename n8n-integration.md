# Integração N8N - Análise de Roleta

## Configuração do Fluxo N8N

### 1. Webhook de Entrada
- **URL**: `https://webhook.viraw.site/webhook/ativar-n8n`
- **Método**: POST
- **Content-Type**: application/json

### 2. Estrutura do Fluxo Sugerido

```
Webhook → [Sua Análise + Agente IA] → HTTP Request (para página HTML)
```

### 3. Configuração do Nó HTTP Request (Final)

**Configurações do HTTP Request:**
- **URL**: `https://seu-dominio.com/update-analysis` (ou use um serviço como ngrok)
- **Método**: POST
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "output": "{{ $json.output }}",
    "timestamp": "{{ $now }}",
    "status": "completed"
  }
  ```

### 4. Alternativa: Usando Local Storage + Polling

Se não conseguir configurar um endpoint para receber dados, você pode:

1. **Modificar o JavaScript** para fazer polling em um endpoint que retorna o último resultado
2. **Criar um endpoint simples** que armazena o último resultado do N8N
3. **Usar um serviço como Firebase** para armazenar temporariamente os resultados

### 5. Exemplo de Endpoint Simples (Node.js)

```javascript
const express = require('express');
const app = express();

let lastResult = null;

app.use(express.json());

// Endpoint para receber dados do N8N
app.post('/update-analysis', (req, res) => {
    lastResult = req.body;
    res.json({ success: true });
});

// Endpoint para a página fazer polling
app.get('/get-last-analysis', (req, res) => {
    res.json(lastResult);
});

app.listen(3000);
```

### 6. Modificação no JavaScript (Polling Real)

Substitua a função `startPolling()` no JavaScript por:

```javascript
function startPolling() {
    pollingInterval = setInterval(async () => {
        pollingAttempts++;
        
        try {
            const response = await fetch('https://seu-dominio.com/get-last-analysis');
            const data = await response.json();
            
            if (data && data.output) {
                updateAnalysisContent(data);
                showStatus('Análise concluída com sucesso!', 'success');
                stopPolling();
                resetButton();
                return;
            }

            showStatus(`Aguardando resultados... (${pollingAttempts}/${MAX_POLLING_ATTEMPTS})`, 'info');

        } catch (error) {
            console.error('Erro no polling:', error);
            showStatus(`Erro ao verificar resultados: ${error.message}`, 'error');
            stopPolling();
            resetButton();
        }

        if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
            showStatus('Timeout: Análise demorou mais que o esperado', 'error');
            stopPolling();
            resetButton();
        }
    }, POLLING_INTERVAL);
}
```

## Próximos Passos

1. **Teste o webhook** - Verifique se o N8N está recebendo os dados corretamente
2. **Configure o endpoint final** - Crie um endpoint para receber os resultados do N8N
3. **Ajuste o polling** - Modifique o JavaScript para fazer polling real
4. **Teste a integração completa** - Verifique se tudo funciona end-to-end

## Troubleshooting

- **CORS**: Se houver problemas de CORS, configure os headers apropriados
- **Timeout**: Ajuste `MAX_POLLING_ATTEMPTS` e `POLLING_INTERVAL` conforme necessário
- **Erro 404**: Verifique se a URL do webhook está correta
- **Dados não aparecem**: Verifique se o formato do JSON está correto
