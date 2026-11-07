const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.LOCKET_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: 'Thiếu biến môi trường LOCKET_API_KEY' });
  }

  let targetPath = req.query.endpoint || '';
  if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;

  const sep = targetPath.includes('?') ? '&' : '?';
  if (!targetPath.includes('api_key=')) {
    targetPath = `${targetPath}${sep}api_key=${encodeURIComponent(apiKey)}`;
  }

  let bodyData = '';
  if (req.body && req.method !== 'GET') {
    const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    bodyObj.api_key = apiKey;
    bodyData = JSON.stringify(bodyObj);
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json, */*',
    'User-Agent': 'LocketGold-CTV-Portal/1.0'
  };
  if (bodyData) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    headers['Content-Length'] = Buffer.byteLength(bodyData);
  }

  const proxyReq = https.request(
    { hostname: 'locket.jayteam.click', port: 443, path: targetPath, method: req.method, headers },
    (proxyRes) => {
      const chunks = [];
      proxyRes.on('data', (c) => chunks.push(c));
      proxyRes.on('end', () => {
        const ct = proxyRes.headers['content-type'] || 'application/json; charset=utf-8';
        res.status(proxyRes.statusCode).setHeader('Content-Type', ct).send(Buffer.concat(chunks));
      });
    }
  );

  proxyReq.on('error', (err) => {
    res.status(502).json({ success: false, message: 'Lỗi kết nối tới máy chủ: ' + err.message });
  });

  if (bodyData) proxyReq.write(bodyData);
  proxyReq.end();
};
