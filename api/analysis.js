// Vercel Serverless Function: /api/analysis
// - POST: recebe dados do n8n { id, output, timestamp, status }
// - GET: retorna o resultado do id solicitado (?id=...)

const results = new Map(); // id -> { output, timestamp, status, createdAt }
const TTL_MS = 10 * 60 * 1000; // 10 minutos de retenção
const MAX_ENTRIES = 1000; // limite simples para evitar crescimento descontrolado

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      // defesa simples contra bodies gigantes
      if (data.length > 1_000_000) {
        req.socket.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // Desativado: endpoint não é mais utilizado.
  setCors(res);
  return res.status(410).json({ ok: false, error: 'Endpoint disabled' });
};


