const express = require('express');
const cors = require('cors');

// 1. Yeni nesil Firebase Admin modüllerini çağırıyoruz
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

// 2. Gizli JSON dosyamızı (Tapuyu) çağırıyoruz
const serviceAccount = require('./serviceAccountKey.json');

// 3. Firebase'i yeni yapıyla yetkilendirip başlatıyoruz
initializeApp({
  credential: cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

// 4. Android'in istek atacağı kapıyı (Endpoint) oluşturuyoruz
app.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;

  // Eksik veri gelirse uyar
  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Eksik bilgi gönderdiniz!' });
  }

  // Firebase'in anladığı formata çeviriyoruz
  const message = {
    notification: {
      title: title,
      body: body
    },
    token: token
  };

  try {
    // 5. Bildirimi yeni modüler 'getMessaging()' ile Firebase'e yolluyoruz
    const response = await getMessaging().send(message);
    console.log('Bildirim başarıyla gönderildi:', response);
    res.status(200).json({ success: true, response: response });
  } catch (error) {
    console.error('Bildirim gönderilirken hata oluştu:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Sunucuyu ayağa kaldırıyoruz
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MemeBook sunucusu ${PORT} portunda çalışıyor... 🚀`);
});