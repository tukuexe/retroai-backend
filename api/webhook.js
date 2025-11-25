import axios from 'axios';
import { pipeline } from '@xenova/transformers';

const BOT_TOKEN = '8170582086:AAEb5LIj1flmUeeBlYQZaNm81lxufzA3Zyo';
const BASE_URL  = `https://api.telegram.org/bot${BOT_TOKEN}`;
const ADMIN_ID  = '6142816761';

let generator = null; // singleton

async function getGenerator() {
  if (!generator) {
    generator = await pipeline('text-generation', 'Xenova/DialoGPT-small', {
      quantized: true,
      max_length: 100
    });
  }
  return generator;
}

async function localReply(prompt) {
  const gen = await getGenerator();
  const out = await gen(prompt, { max_new_tokens: 60, temperature: 0.9 });
  return out[0].generated_text.trim();
}

async function sendMessage(chatId, text) {
  return axios.post(`${BASE_URL}/sendMessage`, {
    chat_id: chatId,
    text: text.slice(0, 4000),
    parse_mode: 'Markdown'
  });
}

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const update = req.body;
  if (!update?.message) return res.status(200).end();

  const msg  = update.message;
  const chatId = msg.chat.id;
  const text   = msg.text;

  if (!text) return res.status(200).end();

  if (text === '/getdbchat' && String(chatId) === ADMIN_ID) {
    await sendMessage(chatId, '📦 Chat logs: https://your-site.com/placeholder');
    return res.status(200).end();
  }

  const reply = await localReply(text);
  await sendMessage(chatId, reply);
  res.status(200).end();
};
