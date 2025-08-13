// main.js
require('dotenv').config();
const Parse = require('parse/node'); // Gerekirse ekle

// Fonksiyonları modüllerden yükle
 require('./cloud-functions/chatFunctions');
 require('./cloud-functions/pdfFunctions');
 require('./cloud-functions/contractFunctions');
 require('./cloud-functions/sendContractByEmail');

