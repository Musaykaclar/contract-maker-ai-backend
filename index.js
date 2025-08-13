const express = require('express');
const ParseServer = require('parse-server').ParseServer;
const path = require('path');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = '/parse'; // API yolu

// Parse Server konfigürasyonu
const api = new ParseServer({
  databaseURI:process.env.DATABASE_URI, // MongoDB bağlantı URI'si
  cloud: path.join(__dirname, '/cloud/main.js'), // Cloud Code dosya yolu (gerekirse)
  appId:process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: `http://localhost:${port}${mountPath}`,
  publicServerURL: `http://localhost:${port}${mountPath}`,
  allowClientClassCreation: true,
  enableAnonymousUsers: true,
  allowFileUploads: true,
 fileUpload: {
    enableForPublic: true,      // Genel kullanıcılar için dosya yüklemeyi etkinleştir
    enableForAnonymousUser: true, // Anonymous kullanıcılar için etkinleştir
    enableForAuthenticatedUser: true // Kayıtlı kullanıcılar için etkinleştir
  },
});

// Parse API'yı mount et
app.use(mountPath, api.app);

// Express root endpoint
app.get('/', (req, res) => {
  res.send('✅ Parse Server çalışıyor.');
});
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Async olarak server başlatma (EKLEMEN GEREKEN KISIM)
(async () => {
  try {
    await api.start(); // Bu satır olmadan hata alırsın: "Invalid server state"
    
    const httpServer = require('http').createServer(app);

    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Parse Server http://localhost:${port} adresinde çalışıyor`);
      console.log(`📡 API endpoint: http://localhost:${port}${mountPath}`);
      console.log(`🔍 Sağlık kontrolü: http://localhost:${port}/health`);
    });

    // Canlı sorgular gerekiyorsa:
    ParseServer.createLiveQueryServer(httpServer);
  } catch (error) {
    console.error('❌ Server başlatılamadı:', error);
  }
})();
