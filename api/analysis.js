// Vercel Serverless Function: /api/analysis
// - POST: recebe dados do n8n { output, timestamp, status }
// - GET: retorna o último resultado recebido

let lastResult = null;

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
  setCors(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'object' && req.body !== null ? req.body : await readJson(req);
      const { output, timestamp, status } = body || {};

      const normalizedOutput = typeof output === 'string' ? output : JSON.stringify(output ?? '');

      lastResult = {
        output: normalizedOutput,
        timestamp: timestamp || new Date().toISOString(),
        status: status || 'completed',
      };

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    }
  }

  if (req.method === 'GET') {
    if (!lastResult) return res.status(204).end();
    return res.status(200).json(lastResult);
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).end('Method Not Allowed');
};


