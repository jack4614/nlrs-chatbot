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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NLRS-Chatbot/1.0)' }
    });
    const html = await res.text();

    // Strip HTML tags to get plain text, then find table-like rows
    // The site renders an actual HTML <table>, so look for <tr><td> patterns
    const rows = [];

    // Try matching HTML table rows: <tr> containing dates
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(html)) !== null) {
      const rowHtml = trMatch[1];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const text = cellMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        cells.push(text);
      }
      // Expect 7 cells: From, To, Nights, Deluxe, Glass, King, Twin
      if (cells.length === 7 && /^\d{4}-\d{2}-\d{2}$/.test(cells[0])) {
        rows.push({
          from: cells[0],
          to: cells[1],
          nights: cells[2],
          deluxe: cells[3].toLowerCase().includes('sold') ? 'sold out' : cells[3],
          glass: cells[4].toLowerCase().includes('sold') ? 'sold out' : cells[4],
          king: cells[5].toLowerCase().includes('sold') ? 'sold out' : cells[5],
          twin: cells[6].toLowerCase().includes('sold') ? 'sold out' : cells[6]
        });
      }
    }

    let text = 'LIVE AVAILABILITY DATA (fetched from northernlightsyukon.com):\n\n';
    text += 'Format: From -> To (Nights) | Deluxe | Glass | King | Twin\n\n';

    let currentMonth = '';
    for (const row of rows) {
      const d = new Date(row.from + 'T00:00:00');
      const month = d.toLocaleString('en', { month: 'long', year: 'numeric' });
      if (month !== currentMonth) {
        currentMonth = month;
        text += `\n${month.toUpperCase()}:\n`;
      }
      text += `${row.from} -> ${row.to} (${row.nights}N): Deluxe=${row.deluxe}, Glass=${row.glass}, King=${row.king}, Twin=${row.twin}\n`;
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
