export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  try {
    const data = await req.json();
    const serviceId  = process.env.EMAILJS_SERVICE;
    const key        = process.env.EMAILJS_KEY;
    const templateId = data.type === 'family'
      ? process.env.EMAILJS_TEMPLATE_FAMILY
      : process.env.EMAILJS_TEMPLATE_CALLBACK;

    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: key,
      template_params: {
        guest_name:  data.guest_name  || '',
        guest_phone: data.guest_phone || '',
        guest_email: data.guest_email || '',
        sent_at:     data.sent_at     || '',
        transcript:  data.transcript  || ''
      }
    };

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    return new Response(JSON.stringify({ success: res.ok, response: text }), {
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
