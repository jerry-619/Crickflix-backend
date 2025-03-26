const { createProxyMiddleware } = require('http-proxy-middleware');

const streamProxy = createProxyMiddleware({
  target: 'https://dai.google.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/stream': '/ssai/event', // rewrite path
  },
  onProxyRes: function (proxyRes, req, res) {
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type';
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).json({ error: 'Proxy Error' });
  }
});

module.exports = streamProxy; 