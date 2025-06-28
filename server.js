import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fetchUnreadEmails from './email-parser.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Railway uses dynamic ports
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(bodyParser.json());

// 🔍 Root health check route
app.get('/', (req, res) => {
  res.send('✅ Retell backend is running');
});

// 📩 API route to get unread emails
app.get('/api/emails', async (req, res) => {
  console.log('📥 /api/emails endpoint hit');
  try {
    const emails = await fetchUnreadEmails();
    console.log(`📧 Retrieved ${emails.length} unread email(s)`);
    res.json(emails);
  } catch (err) {
    console.error('❌ Error in /api/emails:', err);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// 🎯 Retell agent creation endpoint
app.post('/api/create-web-call', async (req, res) => {
  try {
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
      },
      body: JSON.stringify({
        agent_id: 'agent_5aa20d278f2d19133966026033',
        agent_version: 12,
      }),
    });

    const data = await response.json();
    if (!data.access_token) {
      console.error('⚠️ No access token returned from Retell API');
      return res.status(500).json({ error: 'No access token returned' });
    }

    res.json(data);
  } catch (err) {
    console.error('❌ Error in /api/create-web-call:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 🚀 Launch server
app.listen(port, () => {
  const url = isProduction
    ? 'on Railway (env PORT used)'
    : `http://localhost:${port}`;
  console.log(`🚀 Retell backend listening at ${url}`);
});
