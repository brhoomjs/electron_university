const { app, BrowserWindow } = require("electron");
const path = require("path");
const url = require("url");

let mainWindow;
const serve = process.argv.slice(1).some((val) => val === "--serve");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: "#ccc",
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, "src/preload.js"),
    },
  });
  if (serve) mainWindow.webContents.openDevTools();
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "src/app/index.html"),
      protocol: "file:",
      slashes: true,
    })
  );

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}
app.on("ready", createWindow);
app.on("window-all-closed", function () {
  app.quit();
});
app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});
