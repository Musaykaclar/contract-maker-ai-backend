const ParseDashboard = require('parse-dashboard');

const dashboard = new ParseDashboard({
  apps: [
    {
      appId: 'musa.321',
      masterKey: 'musamusa.321',
      serverURL: 'http://localhost:1337/parse',
      appName: 'Sözleşme Uygulaması',
      "allowImport": true
    }
  ],
  users: [
    {
      user: 'admin',
      pass: 'admin123'
    }
  ],
}, { allowInsecureHTTP: true });

const express = require('express');
const app = express();

app.use('/dashboard', dashboard);

app.listen(4040, () => {
  console.log('Parse Dashboard running on http://localhost:4040/dashboard');
});
