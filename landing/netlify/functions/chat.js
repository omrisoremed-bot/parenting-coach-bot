const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FALLBACK_MESSAGE =
  "Bonjour ! Je suis ParentEase. Je ne peux pas répondre pour le moment, mais tu peux rejoindre le service en envoyant « join on-help » au +1 415 523 8886 sur WhatsApp. C'est gratuit pendant le lancement !";

const SYSTEM_PROMPT = `Tu es ParentEase, l'assistante virtuelle du service ParentEase Parenting Coach sur WhatsApp.
Tu réponds aux questions sur le service de façon chaleureuse et concise (3 phrases maximum).

Détails du service :
- Plans parentaux personnalisés chaque matin à 8h selon l'âge de l'enfant
- Bilans du soir interactifs à 21h (check-in en 4 questions)
- Coaching IA illimité disponible 24h/24
- Revues hebdomadaires de progression
- 5 langues supportées : français, arabe, espagnol, portugais, anglais
- Messages vocaux supportés avec transcription automatique
- Profil personnalisé selon les défis et le style parental

Pour rejoindre : envoyer « join on-help » au +1 415 523 8886 sur WhatsApp.
Le service est gratuit pendant le lancement.

Tu peux répondre en français, en arabe, en espagnol ou en portugais selon la langue utilisée par l'utilisateur.`;

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: FALLBACK_MESSAGE }),
    };
  }

  let message, history;
  try {
    const body = JSON.parse(event.body || '{}');
    message = body.message;
    history = Array.isArray(body.history) ? body.history : [];
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Message is required' }),
    };
  }

  // Build messages array: system + last 6 history messages + new user message
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
    })),
    { role: 'user', content: message.trim() },
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 256,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() || FALLBACK_MESSAGE;

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error('Chat function error:', err);
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: FALLBACK_MESSAGE }),
    };
  }
};
