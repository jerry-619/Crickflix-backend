const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/stream-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: 'URL parameter is required' });
    }

    // Prevent recursive proxy calls
    if (url.includes('/stream-proxy')) {
      const match = url.match(/url=([^&]+)/);
      if (match) {
        const actualUrl = decodeURIComponent(match[1]);
        return res.redirect(307, `${req.baseUrl}/stream-proxy?url=${encodeURIComponent(actualUrl)}`);
      }
      return res.status(400).json({ message: 'Invalid proxy URL' });
    }

    // Check if the URL is an m3u8 manifest, mpd manifest, or a segment
    const isManifest = url.endsWith('.m3u8') || url.endsWith('.mpd');
    const isSegment = url.includes('/hlsr/') || url.includes('.ts') || url.includes('.m4s');

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
      const baseUrl = url.split('/').slice(0, 3).join('/');
      headers['Referer'] = baseUrl;
    }

    console.log('Proxying request to:', url);
    console.log('Headers:', headers);

    const response = await axios({
      method: 'get',
      url: url,
      headers: headers,
      responseType: isSegment ? 'arraybuffer' : 'text',
      maxRedirects: 5,
      timeout: 30000,
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });

    // Set appropriate content type
    if (url.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (url.endsWith('.mpd')) {
      res.setHeader('Content-Type', 'application/dash+xml');
    } else if (isSegment) {
      if (url.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/MP2T');
      } else if (url.endsWith('.m4s')) {
        res.setHeader('Content-Type', 'video/mp4');
      }
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

    // For m3u8 manifests, rewrite the URLs to use our proxy
    if (isManifest && typeof response.data === 'string') {
      const manifestLines = response.data.split('\n');
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
      
      const rewrittenManifest = manifestLines.map(line => {
        if (line.startsWith('#')) return line;
        if (!line.trim()) return line;
        
        // Handle both absolute and relative URLs
        const segmentUrl = line.startsWith('http') ? line : new URL(line, baseUrl).toString();
        return `${req.protocol}://${req.get('host')}${req.baseUrl}/stream-proxy?url=${encodeURIComponent(segmentUrl)}`;
      }).join('\n');
      
      res.send(rewrittenManifest);
    } else {
      res.send(response.data);
    }

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