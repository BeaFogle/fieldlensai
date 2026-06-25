export const maxDuration = 30;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Image, mediaType, sectionLabel, forms, inspectorNotes } = req.body;

  if (!base64Image || !sectionLabel) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `Analyze this inspection photo for section: ${sectionLabel}
Florida Forms: ${forms ? forms.join(', ') : 'Home Inspection'}
${inspectorNotes ? `Inspector notes: "${inspectorNotes}"` : ''}

Return ONLY valid JSON with exactly these 5 fields:
{
  "conditionRating": "Good" or "Fair" or "Poor" or "Deficient",
  "deficiencyWriteUp": "Professional Florida SOP language. Max 3 sentences.",
  "recommendedAction": "Monitor" or "Repair" or "Replace",
  "safetyHazard": true or false,
  "floridaForms": ["list of applicable forms"]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: prompt }
          ]
        }]
      }),
    });

    const data = await response.json();
    const raw = data.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json({ success: true, data: parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}