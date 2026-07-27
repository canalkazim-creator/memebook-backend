const express = require('express'); 
const cors = require('cors'); 

// 1. Yeni nesil Firebase Admin modüllerini çağırıyoruz
const { initializeApp, cert } = require('firebase-admin/app'); 
const { getMessaging } = require('firebase-admin/messaging'); 
const { getFirestore } = require('firebase-admin/firestore'); 

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
    // DİKKAT: Artık Android'den "authorId" bilgisini alıyoruz!
    const { authorId, title, body } = req.body; 

    // Eksik veri gelirse uyar 
    if (!authorId || !title || !body) { 
        return res.status(400).json({ error: 'Eksik bilgi gönderdiniz! (authorId, title veya body eksik)' }); 
    } 

    try { 
        // 5. Firestore'dan SADECE hedef kullanıcıyı çekiyoruz (authorId ile)
        const userDoc = await getFirestore().collection('users').doc(authorId).get();
        
        // Kullanıcı veritabanında yoksa işlemi durdur
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Kayıtlı kullanıcı bulunamadı!' });
        }

        // Kullanıcının FCM token'ını alıyoruz
        const fcmToken = userDoc.data().fcmToken;
        
        // Kullanıcının token'ı yoksa işlemi durdur
        if (!fcmToken) {
            return res.status(400).json({ error: 'Bu kullanıcının FCM tokeni sistemde kayıtlı değil!' });
        }

        // 6. Firebase'in anladığı formata çeviriyoruz (Tekli gönderim formatı)
        const message = { 
            notification: { 
                title: title, 
                body: body 
            }, 
            token: fcmToken // Sadece memenin sahibinin (authorId) token'ını veriyoruz
        }; 

        // 7. Bildirimi TEKİL olarak Firebase'e yolluyoruz 
        const response = await getMessaging().send(message); 
        console.log('Bildirim başarıyla fırlatıldı pampa:', response); 
        
        res.status(200).json({ 
            success: true, 
            message: 'Bildirim hedefe başarıyla ulaştı.'
        }); 

    } catch (error) { 
        console.error('Bildirim gönderilirken hata oluştu:', error); 
        res.status(500).json({ error: error.message }); 
    } 
}); 

// 8. Sunucuyu ayağa kaldırıyoruz 
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => { 
    console.log(`MemeBook sunucusu ${PORT} portunda tekil bildirim için çalışıyor... 🚀`); 
});
