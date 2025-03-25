const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/stream-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: 'URL parameter is required' });
    }

    // Check if the URL is an m3u8 manifest or a segment
    const isManifest = url.endsWith('.m3u8');
    const isSegment = url.includes('/hlsr/') || url.includes('.ts');

    // Add necessary headers for the request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    // Add referer if it's a segment request
    if (isSegment) {
      // Extract the base URL from the segment URL
      const baseUrl = url.split('/').slice(0, 3).join('/');
      headers['Referer'] = baseUrl;
    }

    console.log('Proxying request to:', url);

    const response = await axios({
      method: 'get',
      url: url,
      headers: headers,
      responseType: isSegment ? 'arraybuffer' : 'text',
      maxRedirects: 5,
      timeout: 30000,
      validateStatus: function (status) {
        return status >= 200 && status < 300; // Accept only success status codes
      }
    });

    // Set appropriate content type
    if (isManifest) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (isSegment) {
      res.setHeader('Content-Type', 'video/MP2T');
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Send the response
    res.send(response.data);

  } catch (error) {
    console.error('Stream proxy error:', error.message);
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    if (!res.headersSent) {
      const status = error.response?.status || 500;
      const message = error.response?.data || error.message;
      
      res.status(status).json({ 
        message: 'Failed to proxy stream',
        error: message,
        details: error.response?.data
      });
    }
  }
});

module.exports = router; 