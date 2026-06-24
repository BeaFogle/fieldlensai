import { useState } from 'react';
import PhotoAnalysisButton from './components/PhotoAnalysisButton';

const FL_GREEN = '#0F6E56';
const FL_GOLD = '#BA7517';

function App() {
  const [screen, setScreen] = useState('home');
  const [activeSection, setActiveSection] = useState(null);
  const [sectionData, setSectionData] = useState({});

  const sections = [
    { key: 'roof-covering', label: 'Roof Covering', icon: '🏠' },
    { key: 'roof-structure', label: 'Roof Structure/Attic', icon: '🔺' },
    { key: 'exterior-walls', label: 'Exterior Walls', icon: '🧱' },
    { key: 'foundation', label: 'Foundation', icon: '⬛' },
    { key: 'electrical-panel', label: 'Electrical Panel', icon: '⚡' },
    { key: 'electrical-wiring', label: 'Electrical Wiring', icon: '🔌' },
    { key: 'hvac', label: 'HVAC System', icon: '❄️' },
    { key: 'plumbing', label: 'Plumbing', icon: '🚿' },
    { key: 'water-heater', label: 'Water Heater', icon: '🌡️' },
    { key: 'windows-doors', label: 'Windows & Doors', icon: '🪟' },
    { key: 'garage', label: 'Garage', icon: '🚗' },
    { key: 'interior-walls', label: 'Interior Walls/Ceilings', icon: '🏛️' },
    { key: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { key: 'bathrooms', label: 'Bathrooms', icon: '🛁' },
    { key: 'insulation', label: 'Insulation', icon: '🌡️' },
    { key: 'septic', label: 'Septic System', icon: '⚙️' },
    { key: 'well', label: 'Well System', icon: '💧' },
  ];

  function handleAIResult(sectionKey, result) {
    setSectionData(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        conditionRating: result.conditionRating,
        notes: result.deficiencyWriteUp,
        recommendedAction: result.recommendedAction,
        safetyHazard: result.safetyHazard,
        photoSrc: result.photoSrc,
        aiAnalyzed: true,
      }
    }));
  }

  const completedCount = Object.keys(sectionData).length;
  const hazardCount = Object.values(sectionData).filter(s => s.safetyHazard).length;

  // ── HOME SCREEN ──────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F7F5', fontFamily: 'system-ui, sans-serif' }}>
        
        {/* Header */}
        <div style={{ background: FL_GREEN, padding: '20px 16px 24px', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 500, opacity: .7, letterSpacing: '.08em', marginBottom: 4 }}>
            FIELDLENS AI
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>
            Florida Inspection Suite
          </div>
          <div style={{ fontSize: 13, opacity: .8 }}>
            AI-powered · 4 Florida forms · Phase 4 live
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ background: '#fff', display: 'flex', borderBottom: '0.5px solid #E0E0E0' }}>
          <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRight: '0.5px solid #E0E0E0' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: FL_GREEN }}>{completedCount}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Sections done</div>
          </div>
          <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRight: '0.5px solid #E0E0E0' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: hazardCount > 0 ? '#E24B4A' : FL_GREEN }}>{hazardCount}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Safety hazards</div>
          </div>
          <div style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: FL_GOLD }}>{sections.length}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Total sections</div>
          </div>
        </div>

        {/* Forms badges */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', background: '#fff', borderBottom: '0.5px solid #E0E0E0' }}>
          {['Home Inspection', '4-Point', 'Wind Mit OIR-B1-1802', 'Roof RCF-1'].map(f => (
            <span key={f} style={{ fontSize: 11, background: '#E1F5EE', color: FL_GREEN, padding: '3px 10px', borderRadius: 10, fontWeight: 500 }}>
              {f}
            </span>
          ))}
        </div>

        {/* Start button */}
        <div style={{ padding: '16px' }}>
          <button
            onClick={() => setScreen('sections')}
            style={{ width: '100%', padding: '16px', background: FL_GREEN, color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            Start New Inspection →
          </button>
        </div>

        {/* Section list preview */}
        <div style={{ padding: '0 16px 32px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
            Inspection sections
          </div>
          {sections.map(s => {
            const done = sectionData[s.key];
            return (
              <div
                key={s.key}
                onClick={() => { setActiveSection(s); setScreen('section'); }}
                style={{ background: '#fff', border: `0.5px solid ${done?.safetyHazard ? '#E24B4A' : done ? '#1D9E75' : '#E0E0E0'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{s.label}</div>
                  {done && <div style={{ fontSize: 12, color: done.safetyHazard ? '#E24B4A' : FL_GREEN }}>
                    {done.conditionRating} · {done.safetyHazard ? '⚠ Safety hazard' : '✓ No hazard'}
                  </div>}
                  {!done && <div style={{ fontSize: 12, color: '#AAA' }}>Tap to inspect</div>}
                </div>
                {done && <span style={{ fontSize: 18 }}>✓</span>}
                {!done && <span style={{ fontSize: 16, color: '#CCC' }}>›</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── SECTION SCREEN ───────────────────────────────────────
  if (screen === 'section' && activeSection) {
    const data = sectionData[activeSection.key] || {};
    const conditions = ['Good', 'Fair', 'Poor', 'Deficient'];
    const condColors = { Good: '#0F6E56', Fair: '#BA7517', Poor: '#854F0B', Deficient: '#A32D2D' };
    const condBg = { Good: '#E1F5EE', Fair: '#FAEEDA', Poor: '#FAEEDA', Deficient: '#FCEBEB' };

    return (
      <div style={{ minHeight: '100vh', background: '#F5F7F5', fontFamily: 'system-ui, sans-serif' }}>
        
        {/* Header */}
        <div style={{ background: FL_GREEN, padding: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontSize: 11, opacity: .7 }}>SECTION</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{activeSection.label}</div>
          </div>
        </div>

        <div style={{ padding: '16px' }}>

          {/* Condition rating */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Condition Rating</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {conditions.map(c => (
                <button
                  key={c}
                  onClick={() => setSectionData(prev => ({ ...prev, [activeSection.key]: { ...prev[activeSection.key], conditionRating: c } }))}
                  style={{ flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 500, borderRadius: 8, border: `0.5px solid ${data.conditionRating === c ? condColors[c] : '#E0E0E0'}`, background: data.conditionRating === c ? condBg[c] : '#fff', color: data.conditionRating === c ? condColors[c] : '#888', cursor: 'pointer' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Inspector Notes</div>
            <textarea
              value={data.notes || ''}
              onChange={e => setSectionData(prev => ({ ...prev, [activeSection.key]: { ...prev[activeSection.key], notes: e.target.value } }))}
              placeholder="Type notes or use AI photo analysis below..."
              style={{ width: '100%', minHeight: 80, fontSize: 13, padding: '8px', borderRadius: 8, border: '0.5px solid #E0E0E0', fontFamily: 'inherit', resize: 'none' }}
            />
          </div>

          {/* AI Photo Analysis */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>AI Photo Analysis</div>
            <div style={{ fontSize: 12, color: '#AAA', marginBottom: 8 }}>Take a photo — Claude Vision writes the finding for you</div>
            <PhotoAnalysisButton
              sectionKey={activeSection.key}
              inspectorNotes={data.notes || ''}
              onResult={(result) => handleAIResult(activeSection.key, result)}
            />
          </div>

          {/* Safety hazard */}
          {data.safetyHazard && (
            <div style={{ background: '#FCEBEB', border: '0.5px solid #E24B4A', borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#A32D2D' }}>Safety Hazard Flagged</div>
                <div style={{ fontSize: 12, color: '#A32D2D' }}>This will be highlighted red in the report</div>
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={() => setScreen('home')}
            style={{ width: '100%', padding: '14px', background: FL_GREEN, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Save & Return to Sections
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
