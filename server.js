const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Use environment variable for secret file path
const firebaseKeyPath = process.env.FIREBASE_CREDENTIALS_PATH || path.join(__dirname, 'firebaseKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(firebaseKeyPath, 'utf8'));

// ✅ Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://YOUR_PROJECT_ID.firebaseio.com' // replace with your Firebase DB URL
});

const db = admin.database();

// GET /balance?ref=REFCODE
app.get('/balance', async (req, res) => {
  const ref = req.query.ref;
  if (!ref) return res.status(400).json({ error: 'Missing ref' });

  try {
    const snapshot = await db.ref(`referrals/${ref}/balance`).once('value');
    const balance = snapshot.val() || 0;
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching balance: ' + err.message });
  }
});

// POST /log-referral
app.post('/log-referral', async (req, res) => {
  const { ref, amount = 0 } = req.body;
  if (!ref) return res.status(400).json({ error: 'Missing ref' });

  try {
    const refPath = db.ref(`referrals/${ref}`);
    await refPath.child('balance').transaction(current => (current || 0) + amount);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log referral: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});