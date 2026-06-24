// ============================================================
// FieldLensAI — Phase 4: Claude Vision API Integration
// File: src/hooks/useAIPhotoAnalysis.js
// ============================================================

import { useState } from 'react';

// ── Section context map ──────────────────────────────────────
// Maps your 39 inspection sections to Florida form references
// so Claude knows exactly what it's looking at.
const SECTION_CONTEXT = {
  'roof-covering':        { label: 'Roof Covering',         forms: ['Home Inspection', '4-Point', 'Wind Mit OIR-B1-1802', 'Roof RCF-1'] },
  'roof-structure':       { label: 'Roof Structure/Attic',  forms: ['Home Inspection', '4-Point'] },
  'exterior-walls':       { label: 'Exterior Walls',        forms: ['Home Inspection', '4-Point'] },
  'foundation':           { label: 'Foundation',            forms: ['Home Inspection', '4-Point'] },
  'electrical-panel':     { label: 'Electrical Panel',      forms: ['Home Inspection', '4-Point'] },
  'electrical-wiring':    { label: 'Electrical Wiring',     forms: ['Home Inspection'] },
  'hvac':                 { label: 'HVAC System',           forms: ['Home Inspection', '4-Point'] },
  'plumbing':             { label: 'Plumbing',              forms: ['Home Inspection', '4-Point'] },
  'water-heater':         { label: 'Water Heater',          forms: ['Home Inspection', '4-Point'] },
  'windows-doors':        { label: 'Windows & Doors',       forms: ['Home Inspection', 'Wind Mit OIR-B1-1802'] },
  'garage':               { label: 'Garage',                forms: ['Home Inspection'] },
  'interior-walls':       { label: 'Interior Walls/Ceilings', forms: ['Home Inspection'] },
  'kitchen':              { label: 'Kitchen',               forms: ['Home Inspection'] },
  'bathrooms':            { label: 'Bathrooms',             forms: ['Home Inspection'] },
  'insulation':           { label: 'Insulation',            forms: ['Home Inspection'] },
  'septic':               { label: 'Septic System',         forms: ['Home Inspection'] },
  'well':                 { label: 'Well System',           forms: ['Home Inspection'] },
  // Add remaining sections as needed — pattern is clear
};

// ── System prompt ────────────────────────────────────────────
// This is what makes Claude respond like a trained inspector,
// not a generic AI. It knows Florida, it knows the forms,
// and it stays within your liability boundaries.
const SYSTEM_PROMPT = `You are an expert AI assistant for FieldLensAI, a professional field inspection 
platform used by licensed Florida home inspectors and insurance adjusters.

Your job is to analyze inspection photos and return structured findings.

CRITICAL RULES:
- You are an observational assistant only. You identify visible conditions.
- Never estimate structural severity — that requires a licensed specialist.
- Safety hazards are flagged based on observable conditions only (visible code violations, 
  active hazards, water intrusion evidence, exposed components, missing safety devices).
- All write-ups must follow Florida Standards of Practice language.
- Write-ups must be professional, concise, and defensible. Use third-person passive voice.
- Never speculate about hidden or concealed conditions.
- Recommended actions: Monitor (cosmetic/minor), Repair (functional deficiency), 
  Replace (end-of-life or safety hazard).

Respond ONLY with a valid JSON object. No preamble, no markdown, no explanation.`;

// ── Main analysis function ───────────────────────────────────
export function useAIPhotoAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * analyzePhoto
   * @param {string} base64Image  - base64 encoded image (no data: prefix)
   * @param {string} mediaType    - 'image/jpeg' | 'image/png' | 'image/webp'
   * @param {string} sectionKey   - key from SECTION_CONTEXT map above
   * @param {string} inspectorNotes - optional notes the inspector already typed
   * @returns {Promise<AnalysisResult>}
   */
  async function analyzePhoto(base64Image, mediaType, sectionKey, inspectorNotes = '') {
    setIsAnalyzing(true);
    setError(null);

    const section = SECTION_CONTEXT[sectionKey] || {
      label: sectionKey,
      forms: ['Home Inspection'],
    };

    // Build the user prompt with full context
    const userPrompt = `Analyze this inspection photo for the following section:

Section: ${section.label}
Florida Forms: ${section.forms.join(', ')}
${inspectorNotes ? `Inspector notes already captured: "${inspectorNotes}"` : ''}

Return a JSON object with exactly these 5 fields:

{
  "conditionRating": "Good" | "Fair" | "Poor" | "Deficient",
  "deficiencyWriteUp": "Professional write-up in Florida SOP language. If no deficiency, write 'No deficiencies observed at time of inspection.' Max 3 sentences.",
  "recommendedAction": "Monitor" | "Repair" | "Replace" | "None",
  "safetyHazard": true | false,
  "floridaForms": ["array of form names this finding applies to from: ${section.forms.join(', ')}"]
}

If the image is unclear or does not show the inspection area, return:
{
  "conditionRating": "Unreadable",
  "deficiencyWriteUp": "Photo quality insufficient for AI analysis. Inspector review required.",
  "recommendedAction": "None",
  "safetyHazard": false,
  "floridaForms": []
}`;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // NOTE: In production, NEVER put your API key here.
          // Route through your Firebase Cloud Function (see aiAnalysis.js below).
          // This placeholder is for local dev only.
          'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Image,
                  },
                },
                {
                  type: 'text',
                  text: userPrompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.content?.[0]?.text || '';

      // Strip any accidental markdown fences and parse
      const clean = rawText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      // Validate required fields
      const required = ['conditionRating', 'deficiencyWriteUp', 'recommendedAction', 'safetyHazard', 'floridaForms'];
      for (const field of required) {
        if (!(field in result)) throw new Error(`AI response missing field: ${field}`);
      }

      return { success: true, data: result };

    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAnalyzing(false);
    }
  }

  return { analyzePhoto, isAnalyzing, error };
}
