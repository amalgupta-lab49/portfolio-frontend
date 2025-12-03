const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // remove /api prefix when forwarding to backend
      },
    })
  );

  // Proxy for market data endpoints
  app.use(
    '/eq',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );

  // Proxy for portfolio endpoints
  app.use(
    '/portfolio',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8080',
      changeOrigin: true,
    })
  );

  // Proxy for sentiment analysis endpoints
  app.use(
    '/sentiment',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      // pathRewrite is needed because Express strips /sentiment prefix before passing to middleware
      // So /sentiment/analyze becomes /analyze, and we need to add /sentiment back
      pathRewrite: {
        '^/': '/sentiment/', // Prepend /sentiment/ to the path
      },
      logLevel: 'debug',
      timeout: 30000, // 30 second timeout
      proxyTimeout: 30000,
      onError: (err, req, res) => {
        console.error('=== PROXY ERROR ===');
        console.error('Error:', err.message);
        console.error('Error code:', err.code);
        console.error('Request URL:', req.url);
        console.error('Request path:', req.path);
        console.error('Request originalUrl:', req.originalUrl);
        if (!res.headersSent) {
          res.status(504).json({ 
            error: 'Gateway timeout - backend server may not be responding',
            details: err.message,
            path: req.path,
            originalUrl: req.originalUrl
          });
        }
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('=== PROXY REQUEST ===');
        console.log('Request URL:', req.url);
        console.log('Request path:', req.path);
        console.log('Request originalUrl:', req.originalUrl);
        console.log('Proxy path:', proxyReq.path);
        console.log('Proxy target:', 'http://127.0.0.1:8000' + proxyReq.path);
        console.log('Request headers:', req.headers);
        console.log('Proxy headers:', proxyReq.getHeaders());
        
        // Ensure Accept header is set
        if (!proxyReq.getHeader('accept') && !proxyReq.getHeader('Accept')) {
          proxyReq.setHeader('Accept', 'application/json');
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('=== PROXY RESPONSE ===');
        console.log('Response status:', proxyRes.statusCode);
      }
    })
  );

  // Proxy for WebSocket chat endpoint
  const chatProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    logLevel: 'debug',
    onError: (err, req, res) => {
      console.error('=== CHAT PROXY ERROR ===');
      console.error('Error:', err.message);
      console.error('Error code:', err.code);
      console.error('Request URL:', req.url);
      if (!res.headersSent) {
        res.status(502).json({ 
          error: 'Bad Gateway - chat server may not be running',
          details: err.message
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log('=== CHAT PROXY REQUEST ===');
      console.log('Request URL:', req.url);
      console.log('Is WebSocket upgrade:', req.headers.upgrade === 'websocket');
    },
    onProxyReqWs: (proxyReq, req, socket) => {
      console.log('=== CHAT WEBSOCKET PROXY REQUEST ===');
      console.log('WebSocket upgrade request for:', req.url);
    }
  });

  app.use('/chat', chatProxy);
}; 