const http = require('http');

// Very small reverse proxy: streams the request to the target service and
// the response back. Enough for JSON APIs, no extra library needed.
function forwardTo(target, serviceName) {
  const base = new URL(target);

  return (req, res) => {
    const options = {
      hostname: base.hostname,
      port: base.port || 80,
      path: req.originalUrl,
      method: req.method,
      headers: { ...req.headers, host: base.host },
      timeout: 8000
    };

    const upstream = http.request(options, upRes => {
      res.writeHead(upRes.statusCode, upRes.headers);
      upRes.pipe(res);
    });

    upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
    upstream.on('error', err => {
      console.error(`${serviceName} unreachable: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ message: `${serviceName} is not reachable right now, please try again` });
      }
    });

    req.pipe(upstream);
  };
}

module.exports = { forwardTo };
