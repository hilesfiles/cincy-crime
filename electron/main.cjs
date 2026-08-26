/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require("electron");
const { createReadStream, existsSync, statSync } = require("node:fs");
const { createServer } = require("node:http");
const path = require("node:path");

const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

function resolveRequest(root, requestUrl) {
  const url = new URL(requestUrl || "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);
  const relative = pathname === "/" ? "index.html" : pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
  let candidate = path.resolve(root, relative);
  if (!path.extname(candidate) && existsSync(path.join(candidate, "index.html"))) candidate = path.join(candidate, "index.html");
  const safeRelative = path.relative(root, candidate);
  if (safeRelative.startsWith("..") || path.isAbsolute(safeRelative)) return null;
  return candidate;
}

function startStaticServer() {
  const root = path.resolve(__dirname, "../out");
  const server = createServer((request, response) => {
    let file = resolveRequest(root, request.url);
    if (!file || !existsSync(file) || !statSync(file).isFile()) file = path.join(root, "404.html");
    response.setHeader("Content-Type", mimeTypes[path.extname(file)] || "application/octet-stream");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'");
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

let staticServer;
app.whenReady().then(async () => {
  const { server, origin } = await startStaticServer();
  staticServer = server;
  const window = new BrowserWindow({
    width: 1440, height: 940, minWidth: 980, minHeight: 680, show: false, autoHideMenuBar: true,
    backgroundColor: "#f5f7f6",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin)) { event.preventDefault(); if (url.startsWith("https://")) shell.openExternal(url); }
  });
  await window.loadURL(origin);
  window.show();
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => staticServer?.close());
