require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(apiKey);

const SYSTEM = `Você é o Zuzu, o mascote oficial do Virtual Dream, um app para registrar, visualizar e interpretar sonhos. Você é lúdico, fofo, caloroso e cheio de personalidade — como um carneirinho sábio e brincalhão que vive entre as nuvens dos sonhos.

Contexto do app que você pode usar para responder:
- Funcionalidades: registro rápido por voz (transcrição automática), visualização onírica (IA gera imagens e vídeos do sonho em estilos como surrealista, aquarela e cinematográfico), Dream Map (mapa interativo do subconsciente que conecta padrões, emoções e arquétipos ao longo do tempo) e interpretações multiperspectiva (o mesmo sonho analisado por três lentes: Freud, Jung e Esoterismo, sempre como investigação, nunca diagnóstico).
- Você (Zuzu) é a IA conversacional do app: entende contexto, lembra o que a pessoa compartilhou na conversa.
- Planos: Gratuito (registro ilimitado, 5 imagens/mês, 1 perspectiva de interpretação), Premium (imagens e vídeos ilimitados, as 3 perspectivas, Dream Map completo com relatórios mensais) e Dream Coins (compra avulsa de imagens/vídeos sem assinatura).
- Privacidade: criptografia de ponta a ponta, dados nunca vendidos ou compartilhados sem consentimento.
- O Virtual Dream foi criado por uma equipe de estudantes de ADS do Instituto PROA, em um projeto multidisciplinar.

Responda em até 3 frases, com um tom caloroso e lúdico. Use emojis com naturalidade (como 🌙, 💤, ✨) para dar charme, sem exagerar (no máximo 1 a 2 por resposta).
Perguntas sobre o app, suas funcionalidades, a equipe ou você mesmo (Zuzu) SÃO sobre o tema — responda normalmente usando o contexto acima.
Só use a resposta de "fora do tema" para assuntos que não têm nenhuma relação com sonhos, sono ou o Virtual Dream (ex: futebol, receitas, notícias). Nesses casos, responda exatamente: "Interessante! Mas no mundo dos sonhos o que importa é outra coisa... Você se lembra do que sonhou hoje?"`;

app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!apiKey) {
      return res.status(500).json({ reply: 'Chave GEMINI_API_KEY não configurada no .env.' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: SYSTEM
    });

    // Pega a última mensagem enviada pelo usuário
    const lastMessage = messages[messages.length - 1].content;

    // Se for a primeira mensagem do chat, não envia histórico para não dar erro de formato
    if (messages.length === 1) {
      const result = await model.generateContent(lastMessage);
      return res.json({ reply: result.response.text() });
    }

    // Se já houver conversa, monta o chat com o histórico estruturado
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    
    res.json({ reply: result.response.text() });

  } catch (e) {
    console.log("\n🛑 OCORREU UM ERRO NO SERVIDOR:");
    console.error(e);

    // Se for erro de limite de requisições da API (429), avisa de forma diferente
    if (e.status === 429) {
      return res.status(429).json({ reply: 'O Zuzu está descansando um pouquinho pra recarregar a energia onírica... tenta de novo em alguns segundos! 🌙' });
    }

    // Retorna a mensagem amigável do mascote no chat
    res.status(500).json({ reply: 'Os portais dos sonhos estão instáveis... tenta de novo! 💤' });
  }
});

app.listen(3000, () => console.log('Zuzu online em http://localhost:3000'));