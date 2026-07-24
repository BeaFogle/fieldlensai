// ============================================================
// FieldLensAI — Claude Vision API Integration
// File: src/hooks/useAIPhotoAnalysis.js
// ============================================================

import { useState } from 'react';

// ── Section context map ──────────────────────────────────────
// Maps your 39 inspection sections to Florida form references
// so Claude knows exactly what it's looking at.
// Each section carries: label (name shown to the AI), forms (Florida forms it
// feeds), and focus (EXACTLY what to assess so the AI stays on that area and
// ignores unrelated items visible in the photo).
const SECTION_CONTEXT = {
  // ── Elevations ──
  'front-elevation':  { label: 'Front Elevation',  forms: ['Home Inspection', '4-Point'], focus: 'the FRONT exterior of the home only: wall cladding/siding, the front entry door(s) and front windows, soffit/fascia/gutters on this side, and the visible roofline of the front. Do NOT assess other elevations, the roof covering itself, or interior areas.' },
  'right-elevation':  { label: 'Right Elevation',  forms: ['Home Inspection', '4-Point'], focus: 'the RIGHT-side exterior only: wall cladding/siding, doors and windows on this side, soffit/fascia/gutters, and the visible roofline of the right side. Do NOT assess other elevations, the roof covering itself, or interior areas.' },
  'rear-elevation':   { label: 'Rear Elevation',   forms: ['Home Inspection', '4-Point'], focus: 'the REAR exterior only: wall cladding/siding, rear doors and windows, soffit/fascia/gutters, and the visible roofline of the rear. Do NOT assess other elevations, the roof covering itself, or interior areas.' },
  'left-elevation':   { label: 'Left Elevation',   forms: ['Home Inspection', '4-Point'], focus: 'the LEFT-side exterior only: wall cladding/siding, doors and windows on this side, soffit/fascia/gutters, and the visible roofline of the left side. Do NOT assess other elevations, the roof covering itself, or interior areas.' },

  // ── Roof slopes ──
  'roof-slope-front': { label: 'Roof – Front Slope', forms: ['Home Inspection', '4-Point', 'Wind Mit OIR-B1-1802', 'Roof RCF-1'], focus: 'the FRONT roof slope only: covering material and its condition (shingles/tile/metal), flashing, exposed or lifted fasteners, penetrations, and debris on this slope. Do NOT assess other slopes, the roof structure, or the attic.' },
  'roof-slope-right': { label: 'Roof – Right Slope', forms: ['Home Inspection', '4-Point', 'Wind Mit OIR-B1-1802', 'Roof RCF-1'], focus: 'the RIGHT roof slope only: covering material and its condition, flashing, fasteners, penetrations, and debris on this slope. Do NOT assess other slopes, the roof structure, or the attic.' },
  'roof-slope-rear':  { label: 'Roof – Rear Slope',  forms: ['Home Inspection', '4-Point', 'Wind Mit OIR-B1-1802', 'Roof RCF-1'], focus: 'the REAR roof slope only: covering material and its condition, flashing, fasteners, penetrations, and debris on this slope. Do NOT assess other slopes, the roof structure, or the attic.' },
  'roof-slope-left':  { label: 'Roof – Left Slope',  forms: ['Home Inspection', '4-Point', 'Wind Mit OIR-B1-1802', 'Roof RCF-1'], focus: 'the LEFT roof slope only: covering material and its condition, flashing, fasteners, penetrations, and debris on this slope. Do NOT assess other slopes, the roof structure, or the attic.' },

  // ── Structure / exterior ──
  'roof-structure':   { label: 'Roof Structure / Attic', forms: ['Home Inspection', '4-Point'], focus: 'the roof framing and attic: trusses/rafters, decking/sheathing, sagging, water staining, daylight, and ventilation. Not the exterior roof covering.' },
  'exterior-walls':   { label: 'Exterior Walls', forms: ['Home Inspection', '4-Point'], focus: 'exterior wall surfaces and cladding: cracks, damage, staining, penetrations, and trim. Not windows, roof, or interior.' },
  'foundation':       { label: 'Foundation', forms: ['Home Inspection', '4-Point'], focus: 'the visible foundation/slab perimeter: cracks, settlement, spalling, and moisture. If the interior slab is covered by flooring, note that a full visual evaluation of the slab is not possible.' },
  'exterior-electrical-panel': { label: 'Exterior Electrical Panel', forms: ['Home Inspection', '4-Point'], focus: 'the OUTDOOR electrical panel/meter/main disconnect: enclosure and cover condition, corrosion, clearances, and breakers/wiring if shown. If the inspector has removed the cover to photograph interior components, that is standard practice — do NOT report the removed cover as a deficiency; assess the components shown.' },
  'water-shutoff':    { label: 'Water Shut-Off', forms: ['Home Inspection'], focus: 'the main water shut-off valve: location, type, condition, and any leakage.' },
  'patio-deck':       { label: 'Patio / Deck', forms: ['Home Inspection'], focus: 'the patio/deck surface and structure: decking, railings, supports, cracks, and trip hazards.' },
  'pool-equipment':   { label: 'Pool / Equipment', forms: ['Home Inspection'], focus: 'the pool and its equipment: pump, filter, heater, visible barriers/safety, and overall condition. Do NOT estimate water chemistry.' },
  'fence-gates':      { label: 'Fence / Gates', forms: ['Home Inspection'], focus: 'fencing and gates: material, condition, damage, and gate operation/latching.' },
  'shed-storage':     { label: 'Shed / Storage', forms: ['Home Inspection'], focus: 'the shed/storage structure: walls, roof, door, and overall condition.' },
  'florida-room':     { label: 'Florida Room / Lanai', forms: ['Home Inspection'], focus: 'the Florida room/lanai: screening, framing, flooring, windows/enclosure, and ceiling.' },

  // ── Systems ──
  'electrical-panel': { label: 'Electrical Panel (Interior)', forms: ['Home Inspection', '4-Point'], focus: 'the INTERIOR electrical panel: breakers, labeling, double-taps, corrosion, and wiring at the panel. If the inspector has removed the dead-front cover to photograph breakers/wiring, that is standard practice — do NOT report the removed cover as a deficiency; assess the interior components shown.' },
  'electrical-wiring':{ label: 'Electrical Wiring', forms: ['Home Inspection', '4-Point'], focus: 'visible wiring, outlets, switches, and junctions: exposed/damaged wiring and improper connections.' },
  'hvac':             { label: 'HVAC (Air Handler & Ducts)', forms: ['Home Inspection', '4-Point'], focus: 'the INDOOR HVAC air handler and ductwork: condition, corrosion, condensate handling, duct connections, and filter. The outdoor condenser is a SEPARATE section — do not assess it here.' },
  'condenser':        { label: 'Condenser (Outdoor Unit)', forms: ['Home Inspection', '4-Point'], focus: 'the OUTDOOR condenser unit only: cabinet condition, coil/fins, refrigerant line insulation, disconnect, level pad, clearances, and visible age/data plate. The indoor air handler is a SEPARATE section.' },
  'plumbing':         { label: 'Plumbing', forms: ['Home Inspection', '4-Point'], focus: 'visible plumbing: supply/drain lines, fixtures, leaks, and corrosion.' },
  'water-heater':     { label: 'Water Heater', forms: ['Home Inspection', '4-Point'], focus: 'the water heater: tank/unit condition, TPR valve and discharge line, connections, corrosion, leaks, and visible age.' },
  'windows-doors':    { label: 'Windows & Doors', forms: ['Home Inspection', 'Wind Mit OIR-B1-1802'], focus: 'windows and exterior doors: operation, glazing, seals, damage, and any visible opening (wind-mitigation) protection.' },
  'insulation':       { label: 'Insulation', forms: ['Home Inspection'], focus: 'insulation in the attic/accessible areas: type, coverage/depth, gaps, and moisture.' },

  // ── Interior rooms ──
  'garage':           { label: 'Garage', forms: ['Home Inspection'], focus: 'the garage: overhead door and its auto-reverse safety, walls/ceiling, floor, firewall separation, and any water heater/electrical present.' },
  'laundry-room':     { label: 'Laundry Room', forms: ['Home Inspection'], focus: 'the laundry area: water connections, dryer venting, drainage, outlets, and visible leaks.' },
  'kitchen':          { label: 'Kitchen', forms: ['Home Inspection'], focus: 'the kitchen: cabinets, counters, sink and under-sink plumbing, outlets/GFCI, and built-in appliances present.' },
  'dining-room':      { label: 'Dining Room', forms: ['Home Inspection'], focus: 'the dining room: walls, ceiling, floor, windows, outlets, and any visible defects.' },
  'living-room':      { label: 'Living Room', forms: ['Home Inspection'], focus: 'the living room: walls, ceiling, floor, windows, outlets, and any visible defects.' },
  'family-room':      { label: 'Family Room', forms: ['Home Inspection'], focus: 'the family room: walls, ceiling, floor, windows, outlets, and any visible defects.' },
  'game-room':        { label: 'Game Room', forms: ['Home Inspection'], focus: 'the game room: walls, ceiling, floor, windows, outlets, and any visible defects.' },
  'office':           { label: 'Office', forms: ['Home Inspection'], focus: 'the office: walls, ceiling, floor, windows, outlets, and any visible defects.' },
  'hallways':         { label: 'Hallways', forms: ['Home Inspection'], focus: 'hallways: walls, ceiling, floor, and the presence/condition of smoke detectors.' },
  'hallway-closets':  { label: 'Hallway Closets', forms: ['Home Inspection'], focus: 'hallway closets: walls, shelving, floor, and any visible defects.' },
  'stairs':           { label: 'Stairs / Stairways', forms: ['Home Inspection'], focus: 'the stairs/stairways: treads and risers, handrails and guardrails (height, graspability, and baluster spacing), landings, headroom, lighting, and any trip hazards, loose components, or damage.' },
  'master-bathroom':  { label: 'Master Bathroom', forms: ['Home Inspection'], focus: 'the master bathroom: sink/toilet/tub/shower fixtures, plumbing, exhaust ventilation, GFCI outlets, and moisture/mold.' },
  'powder-room':      { label: 'Powder Room', forms: ['Home Inspection'], focus: 'the powder room: sink, toilet, plumbing, ventilation, and outlets.' },
  'master-bedroom':   { label: 'Master Bedroom', forms: ['Home Inspection'], focus: 'the master bedroom and its closet: walls, ceiling, floor, windows, outlets, and smoke detector.' },

  // ── Site systems ──
  'septic':           { label: 'Septic System', forms: ['Home Inspection'], focus: 'the visible septic components: tank lid/access and drainfield area, plus any signs of surfacing/backup. Non-invasive visual only.' },
  'well':             { label: 'Well System', forms: ['Home Inspection'], focus: 'the visible well components: wellhead, pressure tank, pump, and wiring; visible condition only.' },
};

// Resolve context for a section key, including dynamically added rooms
// like 'bathroom-2' or 'bedroom-3' (reuse the master room's scope).
function resolveSectionContext(key) {
  if (SECTION_CONTEXT[key]) return SECTION_CONTEXT[key];
  const m = /^(bathroom|bedroom)-(\d+)$/.exec(key || '');
  if (m) {
    const n = m[2];
    if (m[1] === 'bathroom') {
      return { label: `Bathroom ${n}`, forms: ['Home Inspection'],
        focus: 'this bathroom: sink/toilet/tub/shower fixtures, plumbing, exhaust ventilation, GFCI outlets, and moisture/mold.' };
    }
    return { label: `Bedroom ${n}`, forms: ['Home Inspection'],
      focus: 'this bedroom and its closet: walls, ceiling, floor, windows, outlets, and smoke detector.' };
  }
  return { label: key, forms: ['Home Inspection'] };
}

// Sections where a single photo needs context about WHAT it shows, so the AI
// doesn't misread an intentionally-removed panel cover as a defect. Each type
// carries guidance injected into the prompt for that specific shot.
export const PHOTO_TYPES = {
  'electrical-panel': [
    { id: 'cover-on', label: 'Cover on', guidance: 'This photo shows the interior panel with its dead-front cover CLOSED. The interior is NOT visible, so do NOT describe breakers, wiring, connectors, or the circuit directory. Assess only the closed cover, labeling, enclosure condition, and the working clearance in front of the panel.' },
    { id: 'breakers', label: 'Cover off – breakers', guidance: 'The inspector has INTENTIONALLY removed the dead-front cover to photograph the breakers. Do NOT report the removed/absent cover as a deficiency. Assess the breakers, double-taps, labeling, and any signs of overheating.' },
    { id: 'wiring', label: 'Cover off – wiring', guidance: 'The inspector has INTENTIONALLY removed the dead-front cover to photograph the wiring and connections. Do NOT report the removed/absent cover as a deficiency. Assess wiring condition, connections, grounding/bonding, and any damage.' },
  ],
  'exterior-electrical-panel': [
    { id: 'cover-on', label: 'Cover on', guidance: 'This photo shows the exterior panel/meter with its cover installed. Assess the enclosure, cover, corrosion, and clearances.' },
    { id: 'breakers', label: 'Cover off – breakers', guidance: 'The inspector has INTENTIONALLY removed the cover to photograph the breakers/main disconnect. Do NOT report the removed/absent cover as a deficiency. Assess the breakers, disconnect, and any overheating or corrosion.' },
    { id: 'wiring', label: 'Cover off – wiring', guidance: 'The inspector has INTENTIONALLY removed the cover to photograph the wiring/connections. Do NOT report the removed/absent cover as a deficiency. Assess wiring, connections, grounding/bonding, and corrosion.' },
  ],
};

export function getPhotoTypes(sectionKey) {
  return PHOTO_TYPES[sectionKey] || [];
}

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

- STAY IN SCOPE: Only assess and report on components that belong to the specified section/area
  (see "Assess ONLY" in each request). Do NOT describe or flag unrelated items merely because
  they happen to be visible in the photo.
- Standard inspection practices are NOT deficiencies. For example, if an electrical panel's
  dead-front cover has been removed by the inspector to photograph the breakers or wiring, do NOT
  report the missing/removed cover as a defect — evaluate the components shown instead.
- ONLY WHAT IS VISIBLE: Report only conditions that are directly visible in THIS photograph. Never
  infer, assume, or describe components that are hidden, behind a closed cover/door/panel, or simply
  not shown. If an electrical panel's dead-front cover is CLOSED, do NOT describe breakers, wiring,
  connectors, or the circuit directory — comment only on the closed cover, labeling, enclosure,
  surroundings, and working clearance. Analyze this photo on its own; do NOT restate or repeat any
  prior findings or notes.

- MATCH CONFIDENCE TO EVIDENCE: State findings with confidence proportional to what is clearly
  visible. When a condition is ambiguous or cannot be confirmed from the image, use measured
  language ("appears to", "possible", "consistent with") and recommend evaluation by a licensed
  professional — do NOT assert a definitive code violation or safety hazard. Reserve definitive
  violation/hazard wording and specific code citations for conditions that are unambiguous in the photo.

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
  async function analyzePhoto(base64Image, mediaType, sectionKey, inspectorNotes = '', photoTypeGuidance = '') {
    setIsAnalyzing(true);
    setError(null);

    const section = resolveSectionContext(sectionKey);

    // Build the user prompt with full context
    const userPrompt = `Analyze this inspection photo for the following section:

Section: ${section.label}
Florida Forms: ${section.forms.join(', ')}
Assess ONLY: ${section.focus || 'the components that belong to this section; ignore unrelated items visible in the photo'}
${photoTypeGuidance ? `This specific photo: ${photoTypeGuidance}` : ''}
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
