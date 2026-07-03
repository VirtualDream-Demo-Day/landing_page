require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const RAG_URL = process.env.RAG_URL || 'https://virtual-dream-rag.onrender.com';
const genAI = new GoogleGenerativeAI(apiKey);

const SYSTEM = `Você é o Zuzu, o mascote oficial do Virtual Dream, um app para registrar, visualizar e interpretar sonhos. Você é lúdico, fofo, caloroso e cheio de personalidade — como um carneirinho sábio e brincalhão que vive entre as nuvens dos sonhos.

Contexto do app que você pode usar para responder:
- Funcionalidades: registro rápido por voz (transcrição automática), visualização onírica (IA gera imagens e vídeos do sonho em estilos como surrealista, aquarela e cinematográfico), Dream Map (mapa interativo do subconsciente que conecta padrões, emoções e arquétipos ao longo do tempo) e interpretações multiperspectiva (o mesmo sonho analisado por três lentes: Freud, Jung e Esoterismo, sempre como investigação, nunca diagnóstico).
- Você (Zuzu) é a IA conversacional do app: entende contexto, lembra o que a pessoa compartilhou na conversa.
- Planos: Gratuito (registro ilimitado, 5 imagens/mês, 1 perspectiva de interpretação), Premium (imagens e vídeos ilimitados, as 3 perspectivas, Dream Map completo com relatórios mensais) e Dream Coins (compra avulsa de imagens/vídeos sem assinatura).
- Privacidade: criptografia de ponta a ponta, dados nunca vendidos ou compartilhados sem consentimento.
- O Virtual Dream foi criado por uma equipe de estudantes de ADS do Instituto PROA, em um projeto multidisciplinar.

Quando você receber uma interpretação do RAG no contexto, use-a como base para sua resposta — mas mantenha seu tom caloroso e lúdico de Zuzu, reformulando em no máximo 3 frases. Não cite "RAG" ou "base de conhecimento" para o usuário.

Responda em até 3 frases, com um tom caloroso e lúdico. Use emojis com naturalidade (como 🌙, 💤, ✨) para dar charme, sem exagerar (no máximo 1 a 2 por resposta).
Perguntas sobre o app, suas funcionalidades, a equipe ou você mesmo (Zuzu) SÃO sobre o tema — responda normalmente usando o contexto acima.
Só use a resposta de "fora do tema" para assuntos que não têm nenhuma relação com sonhos, sono ou o Virtual Dream (ex: futebol, receitas, notícias). Nesses casos, responda exatamente: "Interessante! Mas no mundo dos sonhos o que importa é outra coisa... Você se lembra do que sonhou hoje?"`;

// Detecta se a mensagem é um relato de sonho
function isDreamNarrative(text) {
  const keywords = ['sonhei', 'sonho', 'pesadelo', 'dormindo', 'acordei', 'estava voando',
    'vi no sonho', 'no meu sonho', 'tive um sonho', 'sonhar', 'dormia'];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw)) && text.length > 20;
}

async function fetchRAGInterpretation(dream) {
  try {
    const res = await fetch(`${RAG_URL}/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dream, vertente: 'jung', length: 'short' }),
      timeout: 30000
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.interpretation || null;
  } catch (e) {
    console.error('[RAG] Falha ao chamar /interpret:', e.message);
    return null;
  }
}

app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!apiKey) {
      return res.status(500).json({ reply: 'Chave GEMINI_API_KEY não configurada no .env.' });
    }

    const lastMessage = messages[messages.length - 1].content;

    // Tenta enriquecer com RAG se for relato de sonho
    let ragContext = '';
    if (isDreamNarrative(lastMessage)) {
      const interpretation = await fetchRAGInterpretation(lastMessage);
      if (interpretation) {
        ragContext = `\n\n[INTERPRETAÇÃO DO RAG — use como base para sua resposta]:\n${interpretation}`;
      }
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: SYSTEM
    });

    const messageWithContext = lastMessage + ragContext;

    if (messages.length === 1) {
      const result = await model.generateContent(messageWithContext);
      return res.json({ reply: result.response.text() });
    }

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(messageWithContext);

    res.json({ reply: result.response.text() });

  } catch (e) {
    console.log("\n🛑 OCORREU UM ERRO NO SERVIDOR:");
    console.error(e);
    if (e.status === 429) {
      return res.status(429).json({ reply: 'O Zuzu está descansando um pouquinho pra recarregar a energia onírica... tenta de novo em alguns segundos! 🌙' });
    }
    res.status(500).json({ reply: 'Os portais dos sonhos estão instáveis... tenta de novo! 💤' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Zuzu online'));