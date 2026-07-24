const express = require('express'); 
const cors = require('cors'); 

// 1. Yeni nesil Firebase Admin modüllerini çağırıyoruz
const { initializeApp, cert } = require('firebase-admin/app'); 
const { getMessaging } = require('firebase-admin/messaging'); 
const { getFirestore } = require('firebase-admin/firestore'); // <-- YENİ: Firestore modülü eklendi

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
    // DİKKAT: Artık dışarıdan tekil "token" almıyoruz, sadece başlık ve içerik alıyoruz.
    const { title, body } = req.body; 

    // Eksik veri gelirse uyar 
    if (!title || !body) { 
        return res.status(400).json({ error: 'Eksik bilgi gönderdiniz! (title veya body eksik)' }); 
    } 

    try { 
        // 5. Firestore'dan TÜM kullanıcıları çekiyoruz
        const usersSnapshot = await getFirestore().collection('users').get();
        
        let tokens = [];
        usersSnapshot.forEach(doc => {
            const fcmToken = doc.data().fcmToken;
            // Kullanıcının token'ı varsa listeye ekle
            if (fcmToken) {
                tokens.push(fcmToken);
            }
        });

        // Veritabanında hiç token bulunamazsa işlemi durdur
        if (tokens.length === 0) {
            return res.status(404).json({ error: 'Sistemde kayıtlı hiçbir FCM token bulunamadı!' });
        }

        // 6. Firebase'in anladığı formata çeviriyoruz (Çoklu gönderim formatı)
        const message = { 
            notification: { 
                title: title, 
                body: body 
            }, 
            tokens: tokens // Tüm token listesini buraya veriyoruz
        }; 

        // 7. Bildirimi toplu (multicast) olarak Firebase'e yolluyoruz 
        const response = await getMessaging().sendEachForMulticast(message); 
        console.log('Toplu bildirim operasyonu bitti. Başarılı:', response.successCount, 'Hatalı:', response.failureCount); 
        
        res.status(200).json({ 
            success: true, 
            successCount: response.successCount,
            failureCount: response.failureCount
        }); 

    } catch (error) { 
        console.error('Bildirim gönderilirken hata oluştu:', error); 
        res.status(500).json({ error: error.message }); 
    } 
}); 

// 8. Sunucuyu ayağa kaldırıyoruz 
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => { 
    console.log(`MemeBook sunucusu ${PORT} portunda çalışıyor... 🚀`); 
});
