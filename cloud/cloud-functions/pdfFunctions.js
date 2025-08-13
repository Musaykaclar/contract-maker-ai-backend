const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const streamBuffers = require('stream-buffers');


Parse.Cloud.define("generatePdfFromText", async (request) => {
  try {
    const { filename } = request.params;

    // 1️⃣ Doğru dosya yolu
    const filePath = path.join(__dirname, '..', 'contracts', filename);

    // 2️⃣ Metni oku
    let text;
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      throw new Error("Sözleşme dosyası okunamadı.");
    }

    // 3️⃣ PDF oluştur
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // 4️⃣ Türkçe karakter destekli font yükle
    const fontPath = path.join(__dirname, '..', 'fonts', 'DejaVuSans.ttf');
    doc.font(fontPath);

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    // 5️⃣ İçeriği yaz
    doc.fontSize(12).text(text, { align: 'left' });

    // 6️⃣ Buffer’ı hazırla
    const pdfData = await new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.end(); // 🟢 Doğru yer burası
    });

    // 7️⃣ Parse.File olarak yükle
    const parseFile = new Parse.File(
      filename.replace('.txt', '.pdf'),
      { base64: pdfData.toString('base64') },
      'application/pdf'
    );
    await parseFile.save();

    return parseFile.url();
  } catch (error) {
    console.error("PDF oluşturulamadı:", error.message);
    throw new Parse.Error(141, `PDF oluşturulamadı: ${error.message}`);
  }
});

Parse.Cloud.define("saveEditedContract", async (req) => {
  try {
    const { threadId, editedContent, originalContent } = req.params;
    const user = req.user;
    
    if (!threadId || !editedContent) {
      throw new Error("Thread ID ve içerik gerekli");
    }

    // Versiyon numarasını bul
    const versionQuery = new Parse.Query("EditedContract");
    versionQuery.equalTo("threadId", threadId);
    versionQuery.descending("version");
    const lastContract = await versionQuery.first({ useMasterKey: true });
    const newVersion = (lastContract?.get("version") || 0) + 1;

    // Yeni kayıt oluştur
    const editedContract = new Parse.Object("EditedContract");
    editedContract.set({
      threadId,
      originalContent: originalContent || "",
      editedContent: editedContent,
      editedAt: new Date(),
      version: newVersion,
      createdBy: user
    });

    // Güvenlik ayarları
    const acl = new Parse.ACL();
    acl.setReadAccess(user.id, true);
    acl.setWriteAccess(user.id, true);
    editedContract.setACL(acl);

    await editedContract.save(null, { useMasterKey: true });

    return {
      success: true,
      contract: {
        id: editedContract.id,
        threadId,
        version: newVersion
      }
    };
  } catch (error) {
    console.error("Kayıt hatası:", error);
    throw new Parse.Error(141, `Kayıt başarısız: ${error.message}`);
  }
});


// 2. Kullanıcının sözleşmelerini getir
Parse.Cloud.define("getUserContracts", async (req) => {
  const query = new Parse.Query("EditedContract");
  query.equalTo("createdBy", req.user);
  query.descending("editedAt");

  // 🔥 Gerçek var olan alanlar:
  query.select(["threadId", "originalContent", "editedContent", "editedAt", "version"]);

  return query.find({ useMasterKey: true });
});


// 3. Thread'e ait versiyonları getir
Parse.Cloud.define("getContractVersions", async (req) => {
  const { threadId } = req.params;
  const query = new Parse.Query("EditedContract");
  query.equalTo("threadId", threadId);
  query.equalTo("createdBy", req.user);
  query.descending("version");
  return query.find({ useMasterKey: true });
});
Parse.Cloud.define("deleteEditedContract", async (req) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      throw new Parse.Error(401, "Kullanıcı doğrulanamadı.");
    }

    if (!id) {
      throw new Parse.Error(400, "Silinecek sözleşmenin ID'si gerekli.");
    }

    const query = new Parse.Query("EditedContract");
    const contract = await query.get(id, { useMasterKey: true });

    if (!contract) {
      throw new Parse.Error(404, "Sözleşme bulunamadı.");
    }

    // Sadece sahibi silebilir
    const createdBy = contract.get("createdBy");
    if (!createdBy || createdBy.id !== user.id) {
      throw new Parse.Error(403, "Bu sözleşmeyi silme yetkiniz yok.");
    }

    await contract.destroy({ useMasterKey: true });

    return { success: true, message: "Sözleşme başarıyla silindi." };
  } catch (error) {
    console.error("Sözleşme silme hatası:", error);
    throw new Parse.Error(141, `Silme başarısız: ${error.message}`);
  }
});
