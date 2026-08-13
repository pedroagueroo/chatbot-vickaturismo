const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaude({ systemPrompt, messages, maxTokens = 600 }) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages
  });
  
  return response.content[0].text;
}

module.exports = { callClaude };
