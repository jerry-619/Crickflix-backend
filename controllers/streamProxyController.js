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
      return null;
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
    try {
      // Get the target URL from the query parameter
      const targetUrl = new URL(req.query.url);
      
      // Preserve original headers
      proxyReq.setHeader('Accept', '*/*');
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
      
      // Add headers for Akamai streams
      if (targetUrl.hostname.includes('akamaized.net')) {
        proxyReq.setHeader('Origin', targetUrl.origin);
        proxyReq.setHeader('Referer', targetUrl.origin);
      }
      
      // Log headers for debugging
      console.log('Proxy Request Headers:', proxyReq.getHeaders());
    } catch (error) {
      console.error('Error setting proxy headers:', error);
    }
  },
  onProxyRes: function (proxyRes, req, res) {
    try {
      // Add CORS headers
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, User-Agent, Origin, Referer';
      
      // Preserve content type
      if (proxyRes.headers['content-type']) {
        proxyRes.headers['Content-Type'] = proxyRes.headers['content-type'];
      }
      
      // Log response for debugging
      console.log(`Proxy Response Status: ${proxyRes.statusCode}`);
      console.log('Response Headers:', proxyRes.headers);
    } catch (error) {
      console.error('Error setting response headers:', error);
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    console.error('Request URL:', req.query.url);
    console.error('Error Details:', err.message);
    
    res.status(500).json({ 
      error: 'Proxy Error',
      details: err.message,
      url: req.query.url
    });
  },
  // Increase timeout for live streams
  proxyTimeout: 60000, // 60 seconds
  timeout: 60000,
  // Add retry logic
  retry: 3,
  retryDelay: 1000,
  // Handle secure connections
  secure: false,
  // Handle redirects
  followRedirects: true
});

module.exports = streamProxy; 