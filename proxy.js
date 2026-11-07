const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY, X-API-Key');
  res.setHeader('X-Proxy-Active', '1');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

 const apiKey = process.env.LOCKET_API_KEY;
if (!apiKey) {
  return res.status(500).json({ success: false, message: 'Thiếu biến môi trường LOCKET_API_KEY' });
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

  // Luôn đính kèm api_key vào URL theo chuẩn Cách 3 trong tài liệu
  const separator = targetPath.includes('?') ? '&' : '?';
  if (!targetPath.includes('api_key=')) {
    targetPath = `${targetPath}${separator}api_key=${encodeURIComponent(apiKey)}`;
  }

  let bodyData = '';
  if (req.body && req.method !== 'GET') {
    const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    bodyObj.api_key = bodyObj.api_key || apiKey;
    bodyData = JSON.stringify(bodyObj);
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'X-API-Key': apiKey,
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
      message: 'Lỗi kết nối tới máy chủ locket.jayteam.click: ' + err.message
    });
  });

  if (bodyData) {
    proxyReq.write(bodyData);
  }
  proxyReq.end();
};
