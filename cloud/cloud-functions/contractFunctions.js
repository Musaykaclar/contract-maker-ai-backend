// main.js - Parse Cloud Code
const fs = require('fs');
const path = require('path');

// Contract text okuma fonksiyonu
Parse.Cloud.define('getContractText', async (request) => {
  const filename = request.params.filename;
  if (!filename) throw new Error('Dosya adı belirtilmedi.');

  const filePath = path.join(__dirname, '..','contracts', filename);

  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject('Dosya bulunamadı veya okunamadı.');
      else resolve(data);
    });
  });
});

// ContractField için beforeSave hook
Parse.Cloud.beforeSave("ContractField", async (request) => {
  if (!request.object.get("contractType")) {
    throw new Error("contractType alanı zorunludur");
  }
  
  if (!request.object.get("name")) {
    throw new Error("name alanı zorunludur");
  }
});


