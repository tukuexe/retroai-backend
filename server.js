// Render web service – PORT supplied by Render
const express = require('express');
const axios   = require('axios');

const app = express();
app.use(express.json());

// HARDCODED – replace ONLY if you rotate token
const BOT_TOKEN = '8170582086:AAEb5LIj1flmUeeBlYQZaNm81lxufzA3Zyo';
const CHAT_ID   = '6142816761';

const AI_APIS = [
  'https://api.afforai.com/api/chat_completion',
  'https://api.deepai.org/api/text-generator',
  'https://api.perplexity.ai/chat/completions',
  'https://api.together.xyz/v1/chat/completions',
  'https://api.mistral.ai/v1/chat/completions',
  'https://api.openai-proxy.org/v1/chat/completions',
  'https://api.groq.com/openai/v1/chat/completions',
  'https://api.huggingface.co/models/microsoft/DialoGPT-large',
  'https://api.cohere.ai/generate',
  'https://api.writesonic.com/v2.0/generate'
];

async function fallbackAI(prompt) {
  for (const url of AI_APIS) {
    try {
      const { data } = await axios.post(url, { prompt, max_tokens: 150 }, {
        headers: { Authorization: 'Bearer free' },
        timeout: 3000
      });
      if (data?.text) return data.text;
    } catch {}
  }
  return '❌ AI is offline. Try again later.';
}

// ---------- routes ----------
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message' });

  const reply = await fallbackAI(message);

  // fire-and-forget to Telegram
  axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: `User: ${message}\nBot: ${reply}`
  }).catch(() => {});

  res.json({ reply });
});

app.post('/telegram-webhook', async (req, res) => {
  const msg = req.body.message;
  if (!msg?.text) return res.sendStatus(200);

  const { text, chat: { id } } = msg;
  if (text === '/getdbchat' && String(id) === String(CHAT_ID)) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: '📦 Full chat log: https://your-site.com/placeholder'
    });
  }
  res.sendStatus(200);
});

// health check
app.get('/', (_, res) => res.send('RetroAI backend alive'));

// Render supplies PORT env var
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
