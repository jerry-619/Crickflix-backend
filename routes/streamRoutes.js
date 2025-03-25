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

    const response = await axios({
      method: 'get',
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      responseType: isSegment ? 'arraybuffer' : 'text',
      maxRedirects: 5,
      timeout: 30000,
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
    if (isSegment) {
      res.send(response.data);
    } else {
      res.send(response.data);
    }

  } catch (error) {
    console.error('Stream proxy error:', error);
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({ 
        message: 'Failed to proxy stream',
        error: error.message,
        details: error.response?.data
      });
    }
  }
});

module.exports = router; 