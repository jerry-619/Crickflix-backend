const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/stream-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: 'URL parameter is required' });
    }

    // Check if the URL is an m3u8 manifest, mpd manifest, or a segment
    const isManifest = url.endsWith('.m3u8') || url.endsWith('.mpd');
    const isSegment = url.includes('/hlsr/') || url.includes('.ts') || url.includes('.m4s');

    // Parse URL parameters
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    // Extract cookies and user agent from URL parameters
    let cookie = params.get('Cookie');
    const userAgent = params.get('User-Agent') || 'Hotstar;in.startv.hotstar/25.02.24.8.11169 (Android/15)';
    
    // Handle the special case where Cookie is after a pipe character
    if (url.includes('|Cookie=')) {
      const cookieMatch = url.match(/\|Cookie=([^&]+)/);
      if (cookieMatch) {
        cookie = decodeURIComponent(cookieMatch[1]);
      }
    }
    
    // Remove these parameters from the URL before making the request
    params.delete('Cookie');
    params.delete('User-Agent');
    urlObj.search = params.toString();
    
    // Clean the URL by removing the pipe and everything after it
    let cleanUrl = urlObj.toString();
    if (cleanUrl.includes('|')) {
      cleanUrl = cleanUrl.split('|')[0];
    }

    // Add necessary headers for the request
    const headers = {
      'User-Agent': userAgent,
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Origin': 'https://www.hotstar.com',
      'Referer': 'https://www.hotstar.com/',
      'x-country-code': 'IN',
      'x-platform-code': 'ANDROID',
      'x-client-code': 'hotstar-android',
    };

    // Add cookie if present
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    // Add additional headers for segments
    if (isSegment) {
      const baseUrl = cleanUrl.split('/').slice(0, 3).join('/');
      headers['Referer'] = baseUrl;
    }

    console.log('Proxying request to:', cleanUrl);
    console.log('Headers:', headers);

    const response = await axios({
      method: 'get',
      url: cleanUrl,
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