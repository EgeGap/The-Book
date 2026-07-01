/**
 * Standalone CORS-bypass sidecar for the web dev build. Only the web target
 * needs this: browsers block Yahoo Finance / frankfurter.app directly (no
 * Access-Control-Allow-Origin header on their side), while native RN fetch
 * has no such restriction. Runs as a plain Node process — deliberately NOT
 * an Expo Router API route, since those require web.output "static"/"server",
 * which pre-renders every screen in Node and crashes on `window` (AsyncStorage,
 * SQLite web shim) used by this app's local-first stores.
 *
 * Host is allow-listed so this can't be used as an open proxy.
 */
const http = require("http");
const https = require("https");

const PORT = 8788;
const ALLOWED_HOSTS = new Set(["query1.finance.yahoo.com", "api.frankfurter.dev"]);

// Node's https.get doesn't follow redirects; frankfurter.app's Cloudflare
// front-end 301s on some requests, so we chase Location headers ourselves.
function fetchFollowingRedirects(url, res, hopsLeft) {
  if (hopsLeft <= 0) {
    res.writeHead(508, { "content-type": "application/json" }).end(JSON.stringify({ error: "too many redirects" }));
    return;
  }
  https
    .get(url, (upstream) => {
      const { statusCode, headers } = upstream;
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        upstream.resume(); // discard body
        const redirectUrl = new URL(headers.location, url);
        if (!ALLOWED_HOSTS.has(redirectUrl.hostname)) {
          res.writeHead(403, { "content-type": "application/json" }).end(JSON.stringify({ error: "forbidden redirect host" }));
          return;
        }
        fetchFollowingRedirects(redirectUrl, res, hopsLeft - 1);
        return;
      }
      res.writeHead(statusCode ?? 502, { "content-type": "application/json" });
      upstream.pipe(res);
    })
    .on("error", () => {
      res.writeHead(502, { "content-type": "application/json" }).end(JSON.stringify({ error: "upstream fetch failed" }));
    });
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  if (reqUrl.pathname !== "/proxy") {
    res.writeHead(404).end();
    return;
  }

  const target = reqUrl.searchParams.get("url");
  if (!target) {
    res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "missing url" }));
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "invalid url" }));
    return;
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    res.writeHead(403, { "content-type": "application/json" }).end(JSON.stringify({ error: "forbidden host" }));
    return;
  }

  fetchFollowingRedirects(parsed, res, 3);
});

server.listen(PORT, () => {
  console.log(`[cors-proxy] listening on http://localhost:${PORT}`);
});
