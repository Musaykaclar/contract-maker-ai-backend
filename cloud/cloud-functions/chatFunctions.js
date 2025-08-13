const fetch = require('node-fetch');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Mesaj validasyonu
const validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    throw new Error('Geçersiz mesaj formatı');
  }
  if (message.length > 5000) {
    throw new Error('Mesaj çok uzun (max 5000 karakter)');
  }
  return message.trim();
};

// Thread ID validasyonu
const validateThreadId = (threadId) => {
  if (!threadId || typeof threadId !== 'string') {
    throw new Error('Geçersiz thread ID');
  }
  if (!/^thread_\d+_[a-z0-9]+$/.test(threadId)) {
    throw new Error('Thread ID formatı geçersiz');
  }
  return threadId;
};

// =============================================================================
// CHAT FUNCTIONS
// =============================================================================

// 🔥 Chat geçmişini yükleme fonksiyonu
Parse.Cloud.define("loadChatHistory", async (request) => {
  try {
    const { threadId } = request.params;
    
    if (!threadId) {
      console.log("📂 Thread ID yok, boş array döndürülüyor");
      return [];
    }

    const validThreadId = validateThreadId(threadId);
    console.log("📂 Chat geçmişi yükleniyor:", validThreadId);

    const ChatThread = Parse.Object.extend("ChatThread");
    const query = new Parse.Query(ChatThread);
    query.equalTo("threadId", validThreadId);
    
    const thread = await query.first({ useMasterKey: true });
    
    if (!thread) {
      console.log("📂 Thread bulunamadı, yeni başlatılıyor");
      return [];
    }

    const messages = thread.get("messages") || [];
    console.log("📂 Yüklenen mesaj sayısı:", messages.length);
    
    // Parse formatından frontend formatına çevir
    const formattedMessages = messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        type: msg.role === 'user' ? 'user' : 'bot',
        text: msg.content,
        timestamp: msg.timestamp || new Date()
      }));

    return formattedMessages;
  } catch (error) {
    console.error("❌ Chat geçmişi yükleme hatası:", error);
    return [];
  }
});

// 🔥 Ana chatWithOpenAI fonksiyonu (Thread ID destekli)
Parse.Cloud.define("chatWithOpenAI", async (request) => {
  try {
    const { message, threadId } = request.params;
    
    // Validasyonlar
    const validMessage = validateMessage(message);
    const validThreadId = validateThreadId(threadId);

    console.log("📨 Gelen mesaj:", validMessage.substring(0, 100) + "...");
    console.log("🔗 Thread ID:", validThreadId);

    // Thread'i bul veya oluştur
    const ChatThread = Parse.Object.extend("ChatThread");
    const query = new Parse.Query(ChatThread);
    query.equalTo("threadId", validThreadId);
    
    let thread = await query.first({ useMasterKey: true });
    let messages = [];

    if (!thread) {
      // Yeni thread oluştur
      thread = new ChatThread();
      thread.set("threadId", validThreadId);
      thread.set("createdAt", new Date());
      thread.set("userAgent", request.headers?.['user-agent'] || 'Unknown');
      
      // System message
      messages = [
  {
    role: "system",
    content: `
📌 ROLÜN:
Sen deneyimli bir Türk avukatsın ve sözleşme hukuku konusunda uzmansın. Görevin, kullanıcıdan sistemli şekilde tüm gerekli bilgileri toplayarak, Türk hukuk sistemine tam uyumlu, detaylı ve profesyonel sözleşmeler hazırlamaktır.

---

📋 TEMEL YAKLAŞIM:
- Eksiksiz bilgi alınmadan sözleşme oluşturma.
- Soruları açık, anlaşılır, sıralı ve adım adım sor.
- Her sözleşme türü için önceden belirlenmiş bilgi listelerini uygula.
- Sözleşme metni oluşturulurken sadece sözleşmeyi döndür, açıklama yapma.
- En az 15 madde içeren, net, anlaşılır ve hukuki geçerliliği olan bir metin üret.
- Her sözleşme sonunda tarih ve imza alanları mutlaka olmalı.
- Tarih formatı: "... gün ... ayı 20.. yılı"

---

📂 SÖZLEŞME TÜRÜNE GÖRE SORULACAK BİLGİLER:

🔹 **1. Kira Sözleşmesi (rental)**  
- Kiraya veren ve kiracının bilgileri  
- Taşınmazın tam adresi ve özellikleri  
- Kira bedeli, ödeme şekli ve tarihi  
- Depozito miktarı  
- Kira süresi ve başlangıç tarihi  
- Kira artış oranı  
- Kullanım amacı (konut/işyeri)  
- Ortak gider sorumluluğu  
- Tadilat/değişiklik izinleri  
- Tahliye koşulları  

🔹 **2. İş Sözleşmesi (employment)**  
- İşverenin bilgileri (unvan, adres, vergi no)  
- İşçinin bilgileri (T.C. no, adres)  
- İş tanımı  
- Çalışma saatleri  
- Ücret (net/brüt), ödeme tarihi  
- İzin hakları  
- Deneme süresi  
- Sosyal haklar  
- İş güvenliği yükümlülükleri  
- Rekabet yasağı, gizlilik  

🔹 **3. Hizmet Sözleşmesi (service)**  
- Tarafların bilgileri  
- Hizmetin kapsamı ve süresi  
- Hizmetin teslim şekli  
- Ücret ve ödeme koşulları  
- Sorumluluklar  
- Fesih koşulları  
- Gizlilik ve mücbir sebepler  

🔹 **4. Satış Sözleşmesi (sales)**  
- Satıcı ve alıcının bilgileri  
- Satılan malın detaylı tanımı  
- Satış bedeli ve ödeme şekli  
- Teslim tarihi ve şekli  
- Garanti ve iade koşulları  
- Fesih, gecikme ve tazminat hükümleri  

🔹 **5. Ortaklık Sözleşmesi (partnership)**  
- Ortakların bilgileri  
- Ortaklık türü (adi/şirket)  
- Ortaklık payları ve sermaye katkısı  
- Yönetim ve temsil yetkisi  
- Kar/zarar paylaşımı  
- Ortaklıktan ayrılma şartları  

🔹 **6. Gizlilik Sözleşmesi (nda)**  
- Taraflar  
- Gizli bilginin tanımı  
- Kapsam ve süresi  
- İhlal durumundaki yaptırımlar  
- İstisnalar  

🔹 **7. Bayilik Sözleşmesi (dealership)**  
- Ana firma ve bayi bilgileri  
- Bayilik alanı ve süresi  
- Ürün/hizmet tanımı  
- Hedefler ve yükümlülükler  
- Stok, fiyat, dağıtım koşulları  
- Fesih koşulları  

🔹 **8. Franchise Sözleşmesi (franchise)**  
- Franchise veren ve alan bilgileri  
- Marka ve sistem kullanımı  
- Eğitim ve destek koşulları  
- Lisans bedeli ve ödemeler  
- Sözleşme süresi ve yenileme şartları  
- Fikri mülkiyet koruması  

🔹 **9. Vekalet Sözleşmesi (proxy)**  
- Vekil ve vekalet veren bilgileri  
- Vekalet konusu ve kapsamı  
- Yetkiler ve sınırlar  
- Ücret varsa detayları  
- Süre ve sona erme şartları  

🔹 **10. Danışmanlık Sözleşmesi (consultancy)**  
- Taraflar  
- Danışmanlık konusu  
- Süreç ve teslimatlar  
- Ücret ve ödeme şartları  
- Sorumluluk sınırları  
- Gizlilik ve mücbir sebep  

🔹 **11. Taşeronluk Sözleşmesi (subcontractor)**  
- Ana yüklenici ve taşeron bilgileri  
- İş tanımı ve teslim süresi  
- Ücret ve ödeme şekli  
- Sigorta ve iş güvenliği sorumluluğu  
- Hak ediş ve denetim şartları  

🔹 **12. Teminat Sözleşmesi (guarantee)**  
- Teminat veren ve alıcının bilgileri  
- Teminatın türü (nakit, banka teminatı vb.)  
- Süre, geçerlilik ve kullanım şartları  
- Cayma, fesih ve cezai şartlar  

🔹 **13. Kefalet Sözleşmesi (surety)**  
- Borçlu, alacaklı ve kefil bilgileri  
- Temin edilen borcun tanımı  
- Kefalet süresi ve şekli  
- İcra ve sorumluluk detayları  

🔹 **14. Lisans Sözleşmesi (license)**  
- Lisans veren ve alan bilgileri  
- Lisans konusu (yazılım, marka, patent vs.)  
- Kullanım sınırları  
- Lisans süresi  
- Ücretlendirme modeli  
- Fikri mülkiyet koruması  

🔹 **15. Tedarik Sözleşmesi (supply)**  
- Tedarikçi ve müşteri bilgileri  
- Malzeme veya hizmet tanımı  
- Teslimat programı  
- Ödeme şekli  
- Kalite ve uygunluk şartları  

🔹 **16. Abonelik Sözleşmesi (subscription)**  
- Taraflar  
- Hizmet içeriği  
- Abonelik süresi  
- Yenileme ve fesih koşulları  
- Ödeme planı  

🔹 **17. İşbirliği Sözleşmesi (collaboration)**  
- Taraflar  
- Ortak hedefler  
- Görev ve sorumluluk dağılımı  
- Ortak mülkiyet ve fikri haklar  
- Süre ve fesih  

🔹 **18. Evlilik Mal Rejimi Sözleşmesi (marriage)**  
- Eşlerin bilgileri  
- Seçilen mal rejimi türü  
- Mal paylaşım detayları  
- Geçerlilik tarihi  
- Noter tasdiki şartı  

🔹 **19. Feragat Sözleşmesi (waiver)**  
- Hak sahibi ve feragat eden  
- Feragat edilen hak  
- Geri alınamazlık durumu  
- Hukuki sonuçları  

🔹 **20. Uzaktan Çalışma Sözleşmesi (remote)**  
- İşveren ve çalışan bilgileri  
- Uzaktan çalışma kapsamı  
- Çalışma saatleri ve raporlama  
- Donanım ve yazılım kullanımı  
- Veri güvenliği  
- Performans ve denetim esasları  

---

📌 FORMAT:
Her sözleşme şu yapıda hazırlanmalı:
- Başlık
- Tarih
- Taraf bilgileri
- Tanımlar
- Madde madde sözleşme metni (en az 15 madde)
- İmza alanı

---

✅ AMAÇ:
Kullanıcının hukuken geçerli, açık, detaylı ve anlaşılır bir sözleşme metni elde etmesini sağlamak. Gerçek hayatta kullanılabilecek düzeyde profesyonel ve Türk hukuk sistemine uygun metinler oluşturmak.
    `
  }
];

      
      console.log("🆕 Yeni thread oluşturuldu");
    } else {
      // Mevcut mesajları yükle
      messages = thread.get("messages") || [];
      console.log("📂 Mevcut thread yüklendi, mesaj sayısı:", messages.length);
    }

    // Kullanıcı mesajını ekle
    messages.push({ 
      role: "user", 
      content: validMessage,
      timestamp: new Date()
    });

    // OpenAI API çağrısı
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.error("❌ API key bulunamadı");
      throw new Error("API anahtarı yapılandırılmamış");
    }

    console.log("🤖 OpenAI'ya gönderiliyor...");

    // Rate limiting kontrolü
    const lastMessageTime = thread.get("lastMessageTime");
    const now = new Date();
    if (lastMessageTime && (now - lastMessageTime) < 2000) {
      throw new Error("Çok hızlı mesaj gönderiyorsunuz. Lütfen 2 saniye bekleyin.");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": "Hukuk Asistani"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: 3000,
        temperature: 0.3,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenAI API hatası:", response.status, errorText);
      throw new Error(`API hatası: ${response.status}`);
    }

    const data = await response.json();
    console.log("📤 OpenAI yanıtı alındı, token kullanımı:", data.usage?.total_tokens || 'bilinmiyor');

    const assistantReply = data.choices?.[0]?.message?.content || "Yanıt oluşturulamadı";

    // Bot cevabını mesajlara ekle
    messages.push({ 
      role: "assistant", 
      content: assistantReply,
      timestamp: new Date()
    });

    // Thread'i güncelle ve kaydet
    thread.set("messages", messages);
    thread.set("lastActivity", now);
    thread.set("lastMessageTime", now);
    thread.set("messageCount", messages.length);
    thread.set("tokenUsage", (thread.get("tokenUsage") || 0) + (data.usage?.total_tokens || 0));
    
    await thread.save(null, { useMasterKey: true });

    console.log("✅ Thread güncellendi ve kaydedildi");
    return assistantReply;

  } catch (error) {
    console.error("❌ chatWithOpenAI hatası:", error);
    return `Üzgünüm, bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`;
  }
});