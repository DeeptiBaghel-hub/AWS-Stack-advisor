const { buildSystemPrompt } = require('../utils/assistantContext');
const { generateContent } = require('../utils/geminiClient');

// Our app uses 'user' / 'assistant' internally (matches how the rest of the
// codebase and most chat UIs think about roles); Gemini's API expects
// 'user' / 'model'. Translate at the boundary rather than leaking Gemini's
// vocabulary into the frontend.
function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

async function chat(req, res) {
  const { messages, recommendationContext } = req.body;

  const candidate = await generateContent({
    systemPrompt: buildSystemPrompt(recommendationContext),
    contents: toGeminiContents(messages),
    generationConfig: { maxOutputTokens: 500, temperature: 0.4 },
  });

  if (!candidate || candidate.finishReason === 'SAFETY') {
    return res.json({ reply: 'I can\'t help with that one — try rephrasing, or ask something about AWS services or this app\'s recommendations.' });
  }

  const reply = candidate.content?.parts?.map((p) => p.text).join('') || '';
  res.json({ reply: reply || 'I didn\'t get a usable response — try asking again.' });
}

module.exports = { chat };
