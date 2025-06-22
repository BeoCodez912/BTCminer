const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Serve frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Firebase Admin SDK Setup
const serviceAccount = JSON.parse(fs.readFileSync('./firebaseKey.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ✅ Root route to confirm server works
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Log general frontend events (for logToBlogger)
app.post('/log', async (req, res) => {
  const { entry } = req.body;
  if (!entry) return res.status(400).json({ success: false, error: 'Missing log entry' });

  try {
    await db.collection('logs').add({
      entry,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`📝 Logged: ${entry}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Log Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ GET /balance?ref=ABC123
app.get('/balance', async (req, res) => {
  const { ref } = req.query;
  if (!ref) return res.status(400).json({ error: 'Missing ref' });

  try {
    const doc = await db.collection('referrals').doc(ref).get();
    const balance = doc.exists ? doc.data().balance || 0 : 0;
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /log-referral { ref, amount }
app.post('/log-referral', async (req, res) => {
  const { ref, amount } = req.body;
  if (!ref || typeof amount !== 'number') {
    return res.status(400).json({ success: false, error: 'Missing ref or invalid amount' });
  }

  try {
    const docRef = db.collection('referrals').doc(ref);
    await docRef.set({
      balance: admin.firestore.FieldValue.increment(amount),
    }, { merge: true });

    console.log(`📥 Referral updated: ${ref} +${amount} BTC`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Referral Log Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});