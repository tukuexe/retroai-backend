const express = require('express');
const axios   = require('axios');

const app = express();
app.use(express.json());
app.use(require('cors')()); // safety for frontend

const BOT_TOKEN = '8170582086:AAEb5LIj1flmUeeBlYQZaNm81lxufzA3Zyo';
const CHAT_ID   = '6142816761';

// longer list + higher timeout
const AI_APIS = [
  { url: 'https://api.afforai.com/api/chat_completion', body: q => ({ prompt: q, max_tokens: 150 }) },
  { url: 'https://api.deepai.org/api/text-generator', body: q => ({ text: q }) },
  { url: 'https://api.perplexity.ai/chat/completions', body: q => ({ model: 'pplx-70b-online', messages: [{ role: 'user', content: q }] }) },
  { url: 'https://api.together.xyz/v1/chat/completions', body: q => ({ model: 'togethercomputer/RedPajama-INCITE-7B-Instruct', messages: [{ role: 'user', content: q }], max_tokens: 150 }) },
  { url: 'https://api.groq.com/openai/v1/chat/completions', body: q => ({ model: 'mixtral-8x7b-32768', messages: [{ role: 'user', content: q }], max_tokens: 150 }) },
  { url: 'https://api.openai-proxy.org/v1/chat/completions', body: q => ({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: q }], max_tokens: 150 }) },
  { url: 'https://api.huggingface.co/models/microsoft/DialoGPT-large', body: q => ({ inputs: q }) },
  { url: 'https://api.cohere.ai/generate', body: q => ({ prompt: q, max_tokens: 150 }) },
  { url: 'https://dungeon.chatsite.ai/v1/chat/completions', body: q => ({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: q }] }) },
  { url: 'https://chatgpt-api.shn.hk/v1/chat/completions', body: q => ({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: q }] }) }
];

async function fallbackAI(prompt) {
  for (const api of AI_APIS) {
    try {
      const { data } = await axios.post(api.url, api.body(prompt), {
        headers: { Authorization: 'Bearer free' },
        timeout: 8000 // 8 s
      });
      // dig out text from various response shapes
      const text =
        data?.choices?.[0]?.message?.content ||
        data?.text ||
        data?.generated_text ||
        data?.output ||
        null;
      if (text) return text.trim();
    } catch {}
  }
  return '❌ All free AI endpoints exhausted. Try again later.';
}

// ---------- routes ----------
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message' });

  const reply = await fallbackAI(message);

  axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: `User: ${message}\nBot: ${reply}`
  }).catch(() => {});

  res.json({ reply });
});

app.post('/telegram-webhook', (req, res) => {
  const msg = req.body.message;
  if (msg?.text === '/getdbchat' && String(msg.chat.id) === String(CHAT_ID)) {
    axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: '📦 Chat logs: https://your-site.com/placeholder'
    });
  }
  res.sendStatus(200);
});

app.get('/', (_, res) => res.send('RetroAI backend alive'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
