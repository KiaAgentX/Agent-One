/* Kia Portfolio — desktop shell (Electron).
   Serves the built site (dist/) over the privileged app:// scheme so every
   relative URL, fetch() and the source viewer work fully offline. */
const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

const DIST = path.join(__dirname, "..", "dist");

function resolvePath(url) {
  try {
    let p = decodeURIComponent(new URL(url).pathname);
    if (p.endsWith("/")) p += "index.html";
    p = path.normalize(p).replace(/^([/\\])+/, "");
    const full = path.join(DIST, p);
    if (!full.startsWith(DIST)) return null; /* traversal guard */
    return fs.existsSync(full) && fs.statSync(full).isFile() ? full : null;
  } catch (e) { return null; }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#06060e",
    autoHideMenuBar: true,
    title: "Kia — Software Portfolio",
    icon: path.join(__dirname, "..", "src", "assets", "icon-512.png"),
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  win.loadURL("app://bundle/index.html");
}

app.whenReady().then(() => {
  protocol.handle("app", (req) => {
    const file = resolvePath(req.url);
    if (!file) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
