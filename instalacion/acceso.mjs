import http from 'node:http';
const server = http.createServer((req, res) => {
  const upstream = http.request({ hostname: 'app', port: 3000, path: req.url, method: req.method, headers: req.headers }, response => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
    response.on('error', () => res.destroy());
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('La aplicación todavía no está disponible.');
  });
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
});
server.listen(3000, '0.0.0.0');
process.on('SIGTERM', () => server.close());