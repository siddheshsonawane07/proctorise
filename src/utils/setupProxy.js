const express = require("express");
const httpProxy = require("http-proxy");

const app = express();
const port = 3001;
const proxy = httpProxy.createProxyServer({});

app.use("/proxy", (req, res) => {
  proxy.web(req, res, { target: "https://firebasestorage.googleapis.com" });
});

app.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
});
