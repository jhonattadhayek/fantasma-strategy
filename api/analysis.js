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
  setCors(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'object' && req.body !== null ? req.body : await readJson(req);
      const id = body.id || body.analysisId || body.requestId;
      const { output, timestamp, status } = body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: 'Missing id in body (id/analysisId/requestId)' });
      }

      const normalizedOutput = typeof output === 'string' ? output : JSON.stringify(output ?? '');

      results.set(id, {
        output: normalizedOutput,
        timestamp: timestamp || new Date().toISOString(),
        status: status || 'completed',
        createdAt: Date.now(),
      });

      // limpeza simples por TTL
      const now = Date.now();
      for (const [key, value] of results.entries()) {
        if (now - (value.createdAt || now) > TTL_MS) results.delete(key);
      }
      // limite de entradas
      if (results.size > MAX_ENTRIES) {
        const oldestKey = [...results.entries()].sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0))[0]?.[0];
        if (oldestKey) results.delete(oldestKey);
      }

      return res.status(200).json({ ok: true, id });
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    }
  }

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id') || url.searchParams.get('analysisId') || url.searchParams.get('requestId');
      if (!id) return res.status(204).end();

      const record = results.get(id);
      if (!record) return res.status(204).end();

      if (Date.now() - (record.createdAt || 0) > TTL_MS) {
        results.delete(id);
        return res.status(204).end();
      }

      return res.status(200).json(record);
    } catch (_) {
      return res.status(400).json({ ok: false, error: 'Bad request' });
    }
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).end('Method Not Allowed');
};


