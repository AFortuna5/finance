const ENDPOINT = 'https://3fcf0f19.sibforms.com/serve/MUIFALBTA_9SlhojWEr6aqNmKK2Z285VZqvvyEZ4yCNW-4alstWgqjGAoXf-pZz_0qBEwi8-pBB3DQy1TSdXcwH3IiuS0SsthYYsM4R0vUgPIBqAOVdEmk-9Eui4ntMfS8KbxDKIHuv-dBLh_wlgFBt1mutsDofdJ3kEWU_gkqsyuQfVeyTcO8uZse1mAuW_s91iXX0l4LzcH6i0tA==';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ok: false});
  const email = String(req.body?.EMAIL || '').trim();
  const locale = req.body?.locale === 'en' ? 'en' : 'pt';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return res.status(400).json({ok: false});
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({EMAIL: email, locale})
    });
    res.status(r.ok ? 200 : 502).json({ok: r.ok});
  } catch {
    res.status(502).json({ok: false});
  }
}
