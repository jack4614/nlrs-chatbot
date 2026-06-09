export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  try {
    const data = await req.json();
    const token = process.env.AIRTABLE_TOKEN;
    const base  = process.env.AIRTABLE_BASE;
    const table = process.env.AIRTABLE_TABLE;

    const res = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          'Timestamp': data.timestamp,
          'First Question': data.firstQuestion,
          'Messages': data.messageCount,
          'Callback Requested': data.callbackRequested,
          'Family Referral': data.familyReferral,
          'Transcript': data.transcript
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
