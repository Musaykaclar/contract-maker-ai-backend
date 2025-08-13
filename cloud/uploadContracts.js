const fs = require("fs");
const path = require("path");
const Parse = require("parse/node");

// Parse Server ayarları
Parse.initialize("musa.321", "", "musamusa.321"); // (appId, jsKey, masterKey)
Parse.serverURL = "http://localhost:1337/parse";

const contractsFolder = path.join(__dirname, "contracts");

const contractNames = {
  "kira-sozlesmesi.txt": "Kira Sözleşmesi",
  "is-sozlesmesi.txt": "İş Sözleşmesi",
  "hizmet-sozlesmesi.txt": "Hizmet Sözleşmesi",
  "satis-sozlesmesi.txt": "Satış Sözleşmesi",
  "ortaklik-sozlesmesi.txt": "Ortaklık Sözleşmesi",
  "gizlilik-sozlesmesi.txt": "Gizlilik Sözleşmesi",
  "bayilik-sozlesmesi.txt": "Bayilik Sözleşmesi",
  "franchise-sozlesmesi.txt": "Franchise Sözleşmesi",
  "vekalet-sozlesmesi.txt": "Vekalet Sözleşmesi",
  "danismanlik-sozlesmesi.txt": "Danışmanlık Sözleşmesi",
  "taseronluk-sozlesmesi.txt": "Taşeronluk Sözleşmesi",
  "teminat-sozlesmesi.txt": "Teminat Sözleşmesi",
  "kefalet-sozlesmesi.txt": "Kefalet Sözleşmesi",
  "lisans-sozlesmesi.txt": "Lisans Sözleşmesi",
  "tedarik-sozlesmesi.txt": "Tedarik Sözleşmesi",
  "abonelik-sozlesmesi.txt": "Abonelik Sözleşmesi",
  "isbirligi-sozlesmesi.txt": "İşbirliği Sözleşmesi",
  "evlilik-mal-rejimi-sozlesmesi.txt": "Evlilik Mal Rejimi Sözleşmesi",
  "feragat-sozlesmesi.txt": "Feragat Sözleşmesi",
  "uzaktan-calisma-sozlesmesi.txt": "Uzaktan Çalışma Sözleşmesi"
};

async function uploadContracts() {
  const files = fs.readdirSync(contractsFolder);

  for (const file of files) {
    const filePath = path.join(contractsFolder, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const name = contractNames[file] || file.replace(".txt", "");

    const Contract = Parse.Object.extend("Contracts");
    const contract = new Contract();

    contract.set("name", name);
    contract.set("text", content);

    try {
      await contract.save(null, { useMasterKey: true });
      console.log(`✅ Yüklendi: ${name}`);
    } catch (err) {
      console.error(`❌ Hata (${name}):`, err.message);
    }
  }

  console.log("Tüm sözleşmeler yüklendi.");
}

uploadContracts();
