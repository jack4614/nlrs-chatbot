export const config = { runtime: 'edge' };

const TOPICS = ['availability', 'pricing', 'packages', 'activities', 'aurora', 'dietary', 'chalets', 'transfers', 'cancellation', 'weather', 'clothing', 'wellness', 'flights', 'other'];

async function analyzeConversation(transcript, anthropicKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Analyze this resort chatbot conversation and return ONLY a JSON object with two fields:
1. "topics": a comma-separated string of relevant topics from this list: ${TOPICS.join(', ')}
2. "unanswered": true if the bot said it didn't have information or couldn't answer, false otherwise

Conversation:
${transcript}

Return only valid JSON like: {"topics": "availability, pricing", "unanswered": false}`
      }]
    })
  });
  const data = await res.json();
  const text = data?.content?.[0]?.text || '{}';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    return { topics: 'other', unanswered: false };
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    });
  }

  try {
    const data = await req.json();
    const token    = process.env.AIRTABLE_TOKEN;
    const base     = process.env.AIRTABLE_BASE;
    const table    = process.env.AIRTABLE_TABLE;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Analyze conversation with Claude
    let analysis = { topics: 'other', unanswered: false };
    if (data.transcript && data.transcript.length > 10) {
      analysis = await analyzeConversation(data.transcript, anthropicKey);
    }

    const res = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          'Timestamp':          data.timestamp,
          'First Question':     data.firstQuestion,
          'Messages':           data.messageCount,
          'Callback Requested': data.callbackRequested,
          'Family Referral':    data.familyReferral,
          'Topics':             analysis.topics,
          'Unanswered':         analysis.unanswered,
          'Transcript':         data.transcript
        }
      })
    });

    const result = await res.json();
    return new Response(JSON.stringify({ success: !!result.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
