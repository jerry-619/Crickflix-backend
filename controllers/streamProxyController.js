const { createProxyMiddleware } = require('http-proxy-middleware');

const streamProxy = createProxyMiddleware({
  changeOrigin: true,
  router: function(req) {
    try {
      // Get the target URL from the query parameter
      const targetUrl = new URL(req.query.url);
      return targetUrl.origin;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null; // This will cause the proxy to fail gracefully
    }
  },
  pathRewrite: function(path, req) {
    try {
      // Get the target URL from the query parameter
      const targetUrl = new URL(req.query.url);
      // Return the full path including search params
      return targetUrl.pathname + targetUrl.search;
    } catch (error) {
      console.error('Error rewriting path:', error);
      return path;
    }
  },
  onProxyReq: function(proxyReq, req, res) {
    // Add any necessary headers for the target server
    proxyReq.setHeader('Accept', '*/*');
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
  },
  onProxyRes: function (proxyRes, req, res) {
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, User-Agent';
    
    // Log the response status for debugging
    console.log(`Proxy Response Status: ${proxyRes.statusCode} for URL: ${req.query.url}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    console.error('Request URL:', req.query.url);
    res.status(500).json({ 
      error: 'Proxy Error',
      details: err.message,
      url: req.query.url
    });
  },
  // Add timeout settings
  proxyTimeout: 30000, // 30 seconds
  timeout: 30000,
  // Add retry logic
  retry: 3,
  retryDelay: 1000
});

module.exports = streamProxy; 