// session.js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');



const sessionDir = path.join(app.getPath('userData'));
const sessionFile = path.join(sessionDir, 'session.json');



function ensureDir() {
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
}

function saveSession(data) {
  ensureDir();
  fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2), 'utf8');
}

function loadSession() {
  try {
    if (!fs.existsSync(sessionFile)) return null;
    const raw = fs.readFileSync(sessionFile, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('loadSession error:', e);
    return null;
  }
}

function clearSession() {
  if (fs.existsSync(sessionFile)) {
    fs.unlinkSync(sessionFile);
  }
}

module.exports = {
  saveSession,
  loadSession,
  clearSession
};
