const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetPath = Array.isArray(req.query.path)
    ? '/' + req.query.path.join('/')
    : '/' + (req.query.path || '');

  const bodyData = req.body && Object.keys(req.body).length > 0 
    ? JSON.stringify(req.body) 
    : '';

  const options = {
    hostname: '180.93.61.146',
    port: 443,
    path: targetPath,
    method: req.method,
    rejectUnauthorized: false,
    headers: {
      'X-API-Key': req.headers['x-api-key'] || '',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => (data += chunk));
    proxyRes.on('end', () => {
      res.status(proxyRes.statusCode).setHeader('Content-Type', 'application/json').send(data);
    });
  });

  proxyReq.on('error', (err) => {
    res.status(502).json({
      success: false,
      message: 'Lỗi kết nối tới JayDev Server: ' + err.message
    });
  });

  if (bodyData && req.method !== 'GET') {
    proxyReq.write(bodyData);
  }
  proxyReq.end();
};