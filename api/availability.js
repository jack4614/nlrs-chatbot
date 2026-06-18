export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    });
  }

  try {
    const res = await fetch('https://northernlightsyukon.com/availability/2026-2027/', {
      headers: { 'User-Agent': 'NLRS-Chatbot/1.0' }
    });
    const html = await res.text();

    // Extract table rows using regex
    const rows = [];
    const tableRegex = /\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/g;
    let match;
    while ((match = tableRegex.exec(html)) !== null) {
      const avail = (val) => val.trim().toLowerCase().includes('sold') ? 'sold out' : val.trim();
      rows.push({
        from: match[1],
        to: match[2],
        nights: parseInt(match[3]),
        deluxe: avail(match[4]),
        glass: avail(match[5]),
        king: avail(match[6]),
        twin: avail(match[7])
      });
    }

    // Format as clean text for the AI
    let text = 'LIVE AVAILABILITY DATA (fetched from northernlightsyukon.com):\n\n';
    text += 'Format: From → To (Nights) | Deluxe | Glass | King | Twin\n\n';

    let currentMonth = '';
    for (const row of rows) {
      const month = new Date(row.from).toLocaleString('en', { month: 'long', year: 'numeric' });
      if (month !== currentMonth) {
        currentMonth = month;
        text += `\n${month.toUpperCase()}:\n`;
      }
      text += `${row.from} → ${row.to} (${row.nights}N): Deluxe=${row.deluxe}, Glass=${row.glass}, King=${row.king}, Twin=${row.twin}\n`;
    }

    return new Response(JSON.stringify({ success: true, data: text, rows: rows.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
