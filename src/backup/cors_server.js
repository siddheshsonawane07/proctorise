import http from "http";
import httpProxy from "http-proxy";

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
  // Set up your CORS headers here
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Proxy requests to the actual Firebase Storage URL
  if (req.url.startsWith("/proxy")) {
    req.url = req.url.replace("/?url=", ""); // Remove '/proxy' from the URL
    proxy.web(req, res, { target: "https://firebasestorage.googleapis.com" });
  }
});

const port = 3001; // Choose a port for your proxy server
server.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
});
