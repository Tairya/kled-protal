const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let targetPath = '';
  if (req.query && req.query.endpoint) {
    targetPath = req.query.endpoint.startsWith('/')
      ? req.query.endpoint
      : '/' + req.query.endpoint;
  } else {
    const rawPath = Array.isArray(req.query.path)
      ? req.query.path.join('/')
      : (req.query.path || '');
    const queryParams = new URLSearchParams();
    Object.keys(req.query || {}).forEach((key) => {
      if (key !== 'path') {
        queryParams.append(key, req.query[key]);
      }
    });
    const qs = queryParams.toString();
    targetPath = '/' + rawPath.replace(/^\/+/, '') + (qs ? '?' + qs : '');
  }

  const apiKey = req.headers['x-api-key'] || 'kg_sec_210a2b1e45e95abb';
  const authHeader = req.headers['authorization'] || ('Bearer ' + apiKey);

  let bodyData = '';
  if (req.body && req.method !== 'GET') {
    bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  const headers = {
    'Authorization': authHeader,
    'X-API-KEY': apiKey,
    'Accept': 'application/json, */*',
    'User-Agent': 'LocketGold-CTV-Portal/1.0'
  };

  if (bodyData) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    headers['Content-Length'] = Buffer.byteLength(bodyData);
  }

  const options = {
    hostname: 'locket.jayteam.click',
    port: 443,
    path: targetPath,
    method: req.method,
    rejectUnauthorized: false,
    headers: headers
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const chunks = [];
    proxyRes.on('data', (chunk) => chunks.push(chunk));
    proxyRes.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = proxyRes.headers['content-type'] || 'application/json; charset=utf-8';
      res.status(proxyRes.statusCode).setHeader('Content-Type', contentType).send(buffer);
    });
  });

  proxyReq.on('error', (err) => {
    res.status(502).json({
      success: false,
      message: 'Lỗi kết nối tới Locket Gold VIP Server: ' + err.message
    });
  });

  if (bodyData) {
    proxyReq.write(bodyData);
  }
  proxyReq.end();
};
