const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// �7�3 Serve frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

// �7�3 Firebase Admin SDK Setup
const serviceAccount = JSON.parse(fs.readFileSync('./firebaseKey.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// �7�3 Root route to confirm server works
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// �7�3 Log general frontend events (for logToBlogger)
app.post('/log', async (req, res) => {
  const { entry } = req.body;
  if (!entry) return res.status(400).json({ success: false, error: 'Missing log entry' });

  try {
    await db.collection('logs').add({
      entry,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`�9�5 Logged: ${entry}`);
    res.json({ success: true });
  } catch (err) {
    console.error('�7�4 Log Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// �7�3 GET /balance?ref=ABC123
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

// �7�3 POST /log-referral { ref, amount }
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

    console.log(`�9�3 Referral updated: ${ref} +${amount} BTC`);
    res.json({ success: true });
  } catch (err) {
    console.error('�7�4 Referral Log Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// �7�3 Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`�0�4 Server running at http://localhost:${PORT}`);
});