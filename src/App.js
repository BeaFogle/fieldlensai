import { useState, useEffect, useRef } from 'react';
import PhotoAnalysisButton, { resizeImageForUpload } from './components/PhotoAnalysisButton';

const FL_GREEN = '#0F6E56';
const FL_GOLD = '#BA7517';

const NOT_INSPECTED_TEXT = 'This area was not inspected. The area was not accessible or could not be visually observed at the time of inspection; therefore, no inspection was performed.';

// Each inspector builds their OWN quick-insert statements. They are saved on
// this device under this key (will move to the user's account once logins/
// database are added, so they sync across devices).
const STATEMENTS_KEY = 'fieldlens_statements';
const REPORT_KEY = 'fieldlens_report_info';
const SECTIONDATA_KEY = 'fieldlens_section_data';
const EXTRAROOMS_KEY = 'fieldlens_extra_rooms';

// Sections that get a smoke-detector check (living spaces). Dynamically-added
// bedrooms (bedroom-2, bedroom-3, ...) are matched by pattern below.
// Finding flags an inspector can toggle on any section.
const FLAG_TYPES = [
  { key: 'safetyHazard', label: 'Safety Hazard', icon: '⚠', color: '#A32D2D', bg: '#FCEBEB' },
  { key: 'maintenance', label: 'Maintenance Needed', icon: '🔧', color: '#BA7517', bg: '#FAEEDA' },
  { key: 'cosmetic', label: 'Cosmetic', icon: '🎨', color: '#185FA5', bg: '#E6F1FB' },
  { key: 'recommendation', label: 'Recommendation', icon: '💡', color: '#0F6E56', bg: '#E1F5EE' },
];

const LIVING_SPACE_KEYS = ['master-bedroom', 'living-room', 'family-room', 'game-room', 'dining-room', 'office', 'hallways'];
function isLivingSpace(key) {
  return LIVING_SPACE_KEYS.includes(key) || /^bedroom-\d+$/.test(key || '');
}

function App() {
  const [screen, setScreen] = useState('home');
  const [activeSection, setActiveSection] = useState(null);
  const [sectionData, setSectionData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SECTIONDATA_KEY)) || {}; }
    catch { return {}; }
  });
  const [extraRooms, setExtraRooms] = useState(() => {
    try { return JSON.parse(localStorage.getItem(EXTRAROOMS_KEY)) || []; }
    catch { return []; }
  });
  const [viewPhoto, setViewPhoto] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const coverRef = useRef(null);
  const [statements, setStatements] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STATEMENTS_KEY)) || []; }
    catch { return []; }
  });
  const [showAddStatement, setShowAddStatement] = useState(false);
  const [newStmtLabel, setNewStmtLabel] = useState('');
  const [newStmtText, setNewStmtText] = useState('');
  const [newStmtScope, setNewStmtScope] = useState('section'); // 'section' | 'all'
  const [reportInfo, setReportInfo] = useState(() => {
    try { return JSON.parse(localStorage.getItem(REPORT_KEY)) || {}; }
    catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem(STATEMENTS_KEY, JSON.stringify(statements)); } catch (e) {}
  }, [statements]);

  useEffect(() => {
    try { localStorage.setItem(REPORT_KEY, JSON.stringify(reportInfo)); } catch (e) {}
  }, [reportInfo]);

  // Auto-save the whole inspection. Photos are large, so if the browser storage
  // fills up we fall back to saving everything except photos, so text findings
  // always survive a refresh. (Full photo storage comes with the accounts/DB phase.)
  useEffect(() => {
    try {
      localStorage.setItem(SECTIONDATA_KEY, JSON.stringify(sectionData));
    } catch (e) {
      try {
        const slim = {};
        for (const k in sectionData) {
          const { photos, photoSrc, ...rest } = sectionData[k];
          slim[k] = rest;
        }
        localStorage.setItem(SECTIONDATA_KEY, JSON.stringify(slim));
      } catch (e2) {}
    }
  }, [sectionData]);

  useEffect(() => {
    try { localStorage.setItem(EXTRAROOMS_KEY, JSON.stringify(extraRooms)); } catch (e) {}
  }, [extraRooms]);

  function updateReportInfo(field, value) {
    setSavedFlash(false);
    setReportInfo(prev => ({ ...prev, [field]: value }));
  }

  function updateAttendee(i, value) {
    setSavedFlash(false);
    setReportInfo(prev => {
      const list = Array.isArray(prev.attendees) && prev.attendees.length ? [...prev.attendees] : [''];
      list[i] = value;
      return { ...prev, attendees: list };
    });
  }

  function addAttendee() {
    setReportInfo(prev => {
      const list = Array.isArray(prev.attendees) && prev.attendees.length ? [...prev.attendees] : [''];
      return { ...prev, attendees: [...list, ''] };
    });
  }

  function removeAttendee(i) {
    setReportInfo(prev => {
      const list = Array.isArray(prev.attendees) ? [...prev.attendees] : [];
      list.splice(i, 1);
      return { ...prev, attendees: list.length ? list : [''] };
    });
  }

  function handleCoverPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    resizeImageForUpload(
      file,
      ({ dataUrl }) => updateReportInfo('coverPhoto', dataUrl),
      (err) => console.error('Cover photo failed:', err)
    );
  }

  function addStatement() {
    const label = newStmtLabel.trim();
    const text = newStmtText.trim();
    if (!label || !text) return;
    setStatements(prev => [...prev, {
      id: 'stmt-' + Date.now(),
      label,
      text,
      scope: newStmtScope,
      sectionKey: activeSection ? activeSection.key : null,
    }]);
    setNewStmtLabel('');
    setNewStmtText('');
    setNewStmtScope('section');
    setShowAddStatement(false);
  }

  function deleteStatement(id) {
    setStatements(prev => prev.filter(s => s.id !== id));
  }

  const baseSections = [
    { key: 'front-elevation', label: 'Front Elevation', icon: '🏠' },
    { key: 'right-elevation', label: 'Right Elevation', icon: '🏠' },
    { key: 'rear-elevation', label: 'Rear Elevation', icon: '🏠' },
    { key: 'left-elevation', label: 'Left Elevation', icon: '🏠' },
    { key: 'roof-slope-front', label: 'Roof – Front Slope', icon: '🔺' },
    { key: 'roof-slope-right', label: 'Roof – Right Slope', icon: '🔺' },
    { key: 'roof-slope-rear', label: 'Roof – Rear Slope', icon: '🔺' },
    { key: 'roof-slope-left', label: 'Roof – Left Slope', icon: '🔺' },
    { key: 'roof-structure', label: 'Roof Structure / Attic', icon: '🪜' },
    { key: 'exterior-walls', label: 'Exterior Walls', icon: '🧱' },
    { key: 'foundation', label: 'Foundation', icon: '⬛' },
    { key: 'exterior-electrical-panel', label: 'Exterior Electrical Panel', icon: '⚡' },
    { key: 'water-shutoff', label: 'Water Shut-Off', icon: '🚰' },
    { key: 'patio-deck', label: 'Patio / Deck', icon: '🪵' },
    { key: 'pool-equipment', label: 'Pool / Equipment', icon: '🏊' },
    { key: 'fence-gates', label: 'Fence / Gates', icon: '🚧' },
    { key: 'shed-storage', label: 'Shed / Storage', icon: '🏚️' },
    { key: 'florida-room', label: 'Florida Room / Lanai', icon: '🌴' },
    { key: 'electrical-panel', label: 'Electrical Panel (Interior)', icon: '⚡' },
    { key: 'electrical-wiring', label: 'Electrical Wiring', icon: '🔌' },
    { key: 'hvac', label: 'HVAC (Air Handler & Ducts)', icon: '❄️' },
    { key: 'condenser', label: 'Condenser (Outdoor Unit)', icon: '🌀' },
    { key: 'plumbing', label: 'Plumbing', icon: '🚿' },
    { key: 'water-heater', label: 'Water Heater', icon: '🌡️' },
    { key: 'windows-doors', label: 'Windows & Doors', icon: '🪟' },
    { key: 'insulation', label: 'Insulation', icon: '🧊' },
    { key: 'garage', label: 'Garage', icon: '🚗' },
    { key: 'laundry-room', label: 'Laundry Room', icon: '🧺' },
    { key: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { key: 'dining-room', label: 'Dining Room', icon: '🍽️' },
    { key: 'living-room', label: 'Living Room', icon: '🛋️' },
    { key: 'family-room', label: 'Family Room', icon: '📺' },
    { key: 'game-room', label: 'Game Room', icon: '🎱' },
    { key: 'office', label: 'Office', icon: '💼' },
    { key: 'hallways', label: 'Hallways', icon: '🚪' },
    { key: 'hallway-closets', label: 'Hallway Closets', icon: '🧥' },
    { key: 'master-bathroom', label: 'Master Bathroom', icon: '🛁' },
    { key: 'powder-room', label: 'Powder Room', icon: '🚽' },
    { key: 'master-bedroom', label: 'Master Bedroom', icon: '🛏️' },
    { key: 'septic', label: 'Septic System', icon: '⚙️' },
    { key: 'well', label: 'Well System', icon: '💧' },
  ];

  // User-added bathrooms appear right after the Master Bathroom; added bedrooms
  // right after the Master Bedroom. Everything else stays in the fixed order.
  const sections = baseSections.flatMap(s => {
    if (s.key === 'master-bathroom') return [s, ...extraRooms.filter(r => r.type === 'bathroom')];
    if (s.key === 'master-bedroom') return [s, ...extraRooms.filter(r => r.type === 'bedroom')];
    return [s];
  });

  function addRoom(type) {
    setExtraRooms(prev => {
      const n = prev.filter(r => r.type === type).length + 2; // Master counts as #1
      return [...prev, {
        key: `${type}-${n}`,
        label: type === 'bathroom' ? `Bathroom ${n}` : `Bedroom ${n}`,
        icon: type === 'bathroom' ? '🛁' : '🛏️',
        type,
        removable: true,
      }];
    });
  }

  function removeRoom(key) {
    setExtraRooms(prev => prev.filter(r => r.key !== key));
    setSectionData(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  function markNotInspected() {
    setSectionData(prev => {
      const cur = prev[activeSection.key] || {};
      const existing = (cur.notes || '').trim();
      const notes = existing && existing !== NOT_INSPECTED_TEXT
        ? existing + '\n\n' + NOT_INSPECTED_TEXT
        : NOT_INSPECTED_TEXT;
      return { ...prev, [activeSection.key]: { ...cur, conditionRating: 'Not Inspected', notes } };
    });
  }

  function insertStatement(text) {
    setSectionData(prev => {
      const cur = prev[activeSection.key] || {};
      const existing = (cur.notes || '').trim();
      const notes = existing ? existing + '\n\n' + text : text;
      return { ...prev, [activeSection.key]: { ...cur, notes } };
    });
  }

  function setSectionField(field, value) {
    setSectionData(prev => ({ ...prev, [activeSection.key]: { ...prev[activeSection.key], [field]: value } }));
  }

  function setSmokeDetector(value) {
    const danger = value === 'Present – Not Working' || value === 'Missing';
    setSectionData(prev => ({ ...prev, [activeSection.key]: { ...prev[activeSection.key], smokeDetector: value, safetyHazard: danger } }));
  }

  function handleAIResult(sectionKey, result) {
    setSectionData(prev => {
      const cur = prev[sectionKey] || {};
      // Keep the most severe condition rating across all photos in this section.
      const severity = { Good: 1, Fair: 2, Poor: 3, Deficient: 4 };
      const rating = (severity[result.conditionRating] || 0) >= (severity[cur.conditionRating] || 0)
        ? result.conditionRating
        : cur.conditionRating;
      const existingNotes = (cur.notes || '').trim();
      return {
        ...prev,
        [sectionKey]: {
          ...cur,
          conditionRating: rating,
          // Stack each photo's finding so nothing is lost across multiple photos.
          notes: existingNotes ? existingNotes + '\n\n' + result.deficiencyWriteUp : result.deficiencyWriteUp,
          recommendedAction: result.recommendedAction,
          // Once any photo flags a hazard, the section stays flagged.
          safetyHazard: cur.safetyHazard || result.safetyHazard,
          photoSrc: result.photoSrc,
          photos: [...(cur.photos || []), result.photoSrc],
          aiAnalyzed: true,
        }
      };
    });
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
        <div style={{ padding: '16px 16px 8px' }}>
          <button
            onClick={() => setScreen('intake')}
            style={{ width: '100%', padding: '16px', background: FL_GREEN, color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            Start New Inspection →
          </button>
        </div>

        {/* Generate report button */}
        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={() => setScreen('report')}
            style={{ width: '100%', padding: '14px', background: '#fff', color: FL_GREEN, border: `1.5px solid ${FL_GREEN}`, borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            📄 Generate Report
          </button>
        </div>

        {/* Continue inspection */}
        <div style={{ padding: '0 16px 32px' }}>
          <button
            onClick={() => setScreen('sections')}
            style={{ width: '100%', padding: '14px', background: '#fff', color: FL_GREEN, border: `1.5px solid ${FL_GREEN}`, borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Continue Inspection ({completedCount}/{sections.length}) →
          </button>
        </div>
      </div>
    );
  }

  // ── NEW INSPECTION / DETAILS INTAKE ──────────────────────
  if (screen === 'intake') {
    const detailFields = [
      ['companyName', 'Company name'],
      ['license', 'License #'],
      ['inspectorName', 'Inspector name'],
      ['clientName', 'Client name'],
      ['propertyAddress', 'Property address'],
      ['inspectionDate', 'Inspection date (mm/dd/yyyy)'],
    ];
    const attendees = Array.isArray(reportInfo.attendees) && reportInfo.attendees.length ? reportInfo.attendees : [''];
    return (
      <div style={{ minHeight: '100vh', background: '#F5F7F5', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: FL_GREEN, padding: '14px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ flex: 1, fontWeight: 600 }}>New Inspection</div>
          <button onClick={() => setScreen('report')} style={{ padding: '7px 12px', background: '#fff', color: FL_GREEN, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📄 PDF Report</button>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Claim / Inspection Details</div>
          {detailFields.map(([f, label]) => (
            <input
              key={f}
              value={reportInfo[f] || ''}
              onChange={e => updateReportInfo(f, e.target.value)}
              placeholder={label}
              style={{ width: '100%', fontSize: 14, padding: '11px', borderRadius: 8, border: '0.5px solid #ccc', marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          ))}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Present During Inspection</div>
            {attendees.map((name, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  value={name}
                  onChange={e => updateAttendee(i, e.target.value)}
                  placeholder="Name and role (e.g. John Smith – buyer's agent)"
                  style={{ flex: 1, fontSize: 14, padding: '11px', borderRadius: 8, border: '0.5px solid #ccc', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {attendees.length > 1 && (
                  <button onClick={() => removeAttendee(i)} title="Remove this person" style={{ padding: '0 12px', fontSize: 15, borderRadius: 8, border: '1px solid #A32D2D', background: '#fff', color: '#A32D2D', cursor: 'pointer' }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addAttendee} style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1px dashed ${FL_GREEN}`, background: '#fff', color: FL_GREEN, cursor: 'pointer' }}>＋ Add another person</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Front of House Photo</div>
            {reportInfo.coverPhoto ? (
              <div>
                <img src={reportInfo.coverPhoto} alt="Front of house" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid #E0E0E0', display: 'block', marginBottom: 6 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => coverRef.current?.click()} style={{ flex: 1, padding: '9px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1px solid ${FL_GREEN}`, background: '#fff', color: FL_GREEN, cursor: 'pointer' }}>Replace photo</button>
                  <button onClick={() => updateReportInfo('coverPhoto', '')} style={{ flex: 1, padding: '9px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #A32D2D', background: '#fff', color: '#A32D2D', cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            ) : (
              <button onClick={() => coverRef.current?.click()} style={{ width: '100%', padding: '14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1.5px dashed ${FL_GREEN}`, background: '#fff', color: FL_GREEN, cursor: 'pointer' }}>📷 Add front-of-house photo</button>
            )}
            <input ref={coverRef} type="file" accept="image/*" capture="environment" onChange={handleCoverPhoto} style={{ display: 'none' }} />
            <div style={{ fontSize: 11, color: '#AAA', marginTop: 6 }}>Appears at the top of the report. If left empty, your Front Elevation photo is used.</div>
          </div>

          <button
            onClick={() => setSavedFlash(true)}
            style={{ width: '100%', padding: '11px', background: savedFlash ? '#1D9E75' : '#fff', color: savedFlash ? '#fff' : FL_GREEN, border: `1.5px solid ${savedFlash ? '#1D9E75' : FL_GREEN}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
            {savedFlash ? '✓ Saved' : 'Save Details'}
          </button>
          <button
            onClick={() => setScreen('sections')}
            style={{ width: '100%', padding: '15px', background: FL_GREEN, color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            Start Inspection →
          </button>
          <div style={{ fontSize: 11, color: '#AAA', marginTop: 8 }}>Details save automatically as you type. You can print the PDF report at any time from the button up top.</div>
        </div>
      </div>
    );
  }

  // ── SECTIONS LIST ────────────────────────────────────────
  if (screen === 'sections') {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F7F5', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: FL_GREEN, padding: '14px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Inspection Sections</div>
            {reportInfo.propertyAddress && <div style={{ fontSize: 11, opacity: .8 }}>{reportInfo.propertyAddress}</div>}
          </div>
          <button onClick={() => setScreen('report')} style={{ padding: '7px 12px', background: '#fff', color: FL_GREEN, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📄 PDF Report</button>
        </div>
        <div style={{ padding: '16px' }}>
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
                {s.removable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRoom(s.key); }}
                    style={{ background: 'none', border: 'none', color: '#A32D2D', fontSize: 16, cursor: 'pointer', padding: '0 6px' }}
                    title="Remove this room">✕</button>
                )}
                {done && <span style={{ fontSize: 18 }}>✓</span>}
                {!done && <span style={{ fontSize: 16, color: '#CCC' }}>›</span>}
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 24 }}>
            <button onClick={() => addRoom('bathroom')} style={{ flex: 1, padding: '12px', background: '#fff', border: `1px dashed ${FL_GREEN}`, borderRadius: 10, color: FL_GREEN, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>＋ Add Bathroom</button>
            <button onClick={() => addRoom('bedroom')} style={{ flex: 1, padding: '12px', background: '#fff', border: `1px dashed ${FL_GREEN}`, borderRadius: 10, color: FL_GREEN, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>＋ Add Bedroom</button>
          </div>
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
    const applicableStatements = statements.filter(st => st.scope === 'all' || st.sectionKey === activeSection.key);
    const isHVAC = activeSection.key === 'hvac';
    const showSmoke = isLivingSpace(activeSection.key);
    const returnT = parseFloat(data.returnTemp);
    const supplyT = parseFloat(data.supplyTemp);
    const hasTemps = !isNaN(returnT) && !isNaN(supplyT);
    const tempDiff = hasTemps ? Math.round((returnT - supplyT) * 10) / 10 : null;
    const tempDiffOk = tempDiff !== null && tempDiff >= 14 && tempDiff <= 22;
    const fieldLabelStyle = { fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 };
    const numInputStyle = { width: '100%', fontSize: 14, padding: '8px', borderRadius: 6, border: '0.5px solid #ccc', fontFamily: 'inherit', boxSizing: 'border-box' };

    return (
      <div style={{ minHeight: '100vh', background: '#F5F7F5', fontFamily: 'system-ui, sans-serif' }}>
        
        {/* Header */}
        <div style={{ background: FL_GREEN, padding: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setScreen('sections')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
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
            <button
              onClick={markNotInspected}
              style={{ width: '100%', marginTop: 8, padding: '9px 8px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `0.5px solid ${data.conditionRating === 'Not Inspected' ? '#555' : '#E0E0E0'}`, background: data.conditionRating === 'Not Inspected' ? '#EEEEEE' : '#fff', color: '#555', cursor: 'pointer' }}>
              ⊘ Not Inspected — auto-fills the standard statement
            </button>
          </div>

          {/* Section-specific details */}
          {(isHVAC || showSmoke) && (
            <div style={{ background: '#fff', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>Section Details</div>

              {isHVAC && (
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={fieldLabelStyle}>Return air °F</div>
                      <input type="number" inputMode="decimal" value={data.returnTemp || ''} onChange={e => setSectionField('returnTemp', e.target.value)} style={numInputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={fieldLabelStyle}>Supply air °F</div>
                      <input type="number" inputMode="decimal" value={data.supplyTemp || ''} onChange={e => setSectionField('supplyTemp', e.target.value)} style={numInputStyle} />
                    </div>
                  </div>
                  {hasTemps && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: tempDiffOk ? '#E1F5EE' : '#FCEBEB', color: tempDiffOk ? '#0F6E56' : '#A32D2D', fontSize: 13, fontWeight: 600 }}>
                      Temperature differential: {tempDiff}°F — {tempDiffOk ? 'within normal range (14–22°F)' : 'outside normal range (14–22°F); verify system operation'}
                    </div>
                  )}
                </div>
              )}

              {showSmoke && (
                <div style={{ marginTop: isHVAC ? 12 : 0 }}>
                  <div style={fieldLabelStyle}>Smoke detector</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['Present – Working', 'Present – Not Working', 'Missing', 'N/A'].map(v => {
                      const sel = data.smokeDetector === v;
                      const danger = v === 'Present – Not Working' || v === 'Missing';
                      return (
                        <button key={v} onClick={() => setSmokeDetector(v)}
                          style={{ flex: '1 1 45%', padding: '8px', fontSize: 12, fontWeight: 500, borderRadius: 8, border: `0.5px solid ${sel ? (danger ? '#A32D2D' : '#0F6E56') : '#E0E0E0'}`, background: sel ? (danger ? '#FCEBEB' : '#E1F5EE') : '#fff', color: sel ? (danger ? '#A32D2D' : '#0F6E56') : '#888', cursor: 'pointer' }}>
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Inspector Notes</div>
            <textarea
              value={data.notes || ''}
              onChange={e => setSectionData(prev => ({ ...prev, [activeSection.key]: { ...prev[activeSection.key], notes: e.target.value } }))}
              placeholder="Type notes or use AI photo analysis below..."
              style={{ width: '100%', minHeight: 80, fontSize: 13, padding: '8px', borderRadius: 8, border: '0.5px solid #E0E0E0', fontFamily: 'inherit', resize: 'none' }}
            />
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>My quick statements — tap to insert</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {applicableStatements.map(st => (
                  <span key={st.id} style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${FL_GREEN}`, borderRadius: 14, overflow: 'hidden' }}>
                    <button
                      onClick={() => insertStatement(st.text)}
                      style={{ fontSize: 12, padding: '6px 4px 6px 10px', background: '#fff', border: 'none', color: FL_GREEN, cursor: 'pointer' }}>
                      ＋ {st.label}
                    </button>
                    <button
                      onClick={() => deleteStatement(st.id)}
                      title="Delete this saved statement"
                      style={{ fontSize: 12, padding: '6px 8px', background: '#fff', border: 'none', borderLeft: `1px solid ${FL_GREEN}`, color: '#A32D2D', cursor: 'pointer' }}>✕</button>
                  </span>
                ))}
                {applicableStatements.length === 0 && (
                  <span style={{ fontSize: 12, color: '#AAA' }}>No saved statements yet.</span>
                )}
                <button
                  onClick={() => setShowAddStatement(v => !v)}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 14, border: '1px dashed #999', background: '#fff', color: '#555', cursor: 'pointer' }}>
                  ＋ Add statement
                </button>
              </div>

              {showAddStatement && (
                <div style={{ marginTop: 8, padding: 10, border: '0.5px solid #E0E0E0', borderRadius: 8, background: '#FAFAFA' }}>
                  <input
                    value={newStmtLabel}
                    onChange={e => setNewStmtLabel(e.target.value)}
                    placeholder="Short button name (e.g. Slab limitation)"
                    style={{ width: '100%', fontSize: 13, padding: '8px', borderRadius: 6, border: '0.5px solid #ccc', marginBottom: 6, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <textarea
                    value={newStmtText}
                    onChange={e => setNewStmtText(e.target.value)}
                    placeholder="Full wording that will be inserted into the notes..."
                    style={{ width: '100%', minHeight: 70, fontSize: 13, padding: '8px', borderRadius: 6, border: '0.5px solid #ccc', marginBottom: 6, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button onClick={() => setNewStmtScope('section')} style={{ flex: 1, fontSize: 12, padding: '7px', borderRadius: 6, border: `0.5px solid ${newStmtScope === 'section' ? FL_GREEN : '#ccc'}`, background: newStmtScope === 'section' ? '#E1F5EE' : '#fff', color: newStmtScope === 'section' ? FL_GREEN : '#555', cursor: 'pointer' }}>This section only</button>
                    <button onClick={() => setNewStmtScope('all')} style={{ flex: 1, fontSize: 12, padding: '7px', borderRadius: 6, border: `0.5px solid ${newStmtScope === 'all' ? FL_GREEN : '#ccc'}`, background: newStmtScope === 'all' ? '#E1F5EE' : '#fff', color: newStmtScope === 'all' ? FL_GREEN : '#555', cursor: 'pointer' }}>All sections</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowAddStatement(false)} style={{ flex: 1, fontSize: 13, padding: '9px', borderRadius: 6, border: '0.5px solid #ccc', background: '#fff', color: '#555', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={addStatement} style={{ flex: 2, fontSize: 13, fontWeight: 600, padding: '9px', borderRadius: 6, border: 'none', background: FL_GREEN, color: '#fff', cursor: 'pointer' }}>Save statement</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Photo Analysis */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>AI Photo Analysis</div>
            <div style={{ fontSize: 12, color: '#AAA', marginBottom: 8 }}>Take a photo — Claude Vision writes the finding for you</div>
            <PhotoAnalysisButton
              sectionKey={activeSection.key}
              inspectorNotes=""
              onResult={(result) => handleAIResult(activeSection.key, result)}
            />
          </div>

          {/* Saved photos for this section — tap to view any time */}
          {data.photos && data.photos.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Saved Photos ({data.photos.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.photos.map((p, i) => (
                  <img key={i} src={p} alt="" onClick={() => setViewPhoto(p)} style={{ width: 92, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #E0E0E0', cursor: 'pointer' }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#AAA', marginTop: 6 }}>Tap a photo to view it larger. The AI findings for these photos are saved in the notes above.</div>
            </div>
          )}

          {/* Finding flags — tap to toggle; inspector always has final say */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Flags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FLAG_TYPES.map(fl => {
                const on = !!data[fl.key];
                return (
                  <button
                    key={fl.key}
                    onClick={() => setSectionField(fl.key, !on)}
                    style={{ flex: '1 1 45%', padding: '9px 6px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `0.5px solid ${on ? fl.color : '#E0E0E0'}`, background: on ? fl.bg : '#fff', color: on ? fl.color : '#888', cursor: 'pointer' }}>
                    {fl.icon} {fl.label}
                  </button>
                );
              })}
            </div>
            {data.safetyHazard && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#A32D2D', fontWeight: 600 }}>⚠ Safety hazard — highlighted red in the report. Tap again to remove.</div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={() => setScreen('sections')}
            style={{ width: '100%', padding: '14px', background: FL_GREEN, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Save & Return to Sections
          </button>
        </div>

        {viewPhoto && (
          <div onClick={() => setViewPhoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <img src={viewPhoto} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        )}
      </div>
    );
  }

  // ── REPORT SCREEN ────────────────────────────────────────
  if (screen === 'report') {
    const doneSections = sections.filter(s => sectionData[s.key]);
    const hazards = sections.filter(s => sectionData[s.key]?.safetyHazard);
    const attendeeList = (reportInfo.attendees || []).filter(a => a && a.trim());
    const frontElev = sectionData['front-elevation'];
    const coverPhoto = reportInfo.coverPhoto || (frontElev && frontElev.photos && frontElev.photos[0]) || '';
    const detailFields = [
      ['companyName', 'Company name'],
      ['license', 'License #'],
      ['inspectorName', 'Inspector name'],
      ['clientName', 'Client name'],
      ['propertyAddress', 'Property address'],
      ['inspectionDate', 'Inspection date'],
    ];
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <style>{`@media print { .no-print { display: none !important; } .report-page { padding: 0 !important; max-width: none !important; } }`}</style>

        {/* Toolbar */}
        <div className="no-print" style={{ position: 'sticky', top: 0, background: FL_GREEN, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 10 }}>
          <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
          <div style={{ flex: 1, color: '#fff', fontWeight: 600 }}>Inspection Report</div>
          <button onClick={() => window.print()} style={{ padding: '8px 14px', background: '#fff', color: FL_GREEN, border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Save as PDF</button>
        </div>

        {/* Report details form */}
        <div className="no-print" style={{ padding: 16, background: '#F5F7F5', borderBottom: '1px solid #E0E0E0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Report Details</div>
          {detailFields.map(([f, label]) => (
            <input
              key={f}
              value={reportInfo[f] || ''}
              onChange={e => updateReportInfo(f, e.target.value)}
              placeholder={label}
              style={{ width: '100%', fontSize: 13, padding: '9px', borderRadius: 6, border: '0.5px solid #ccc', marginBottom: 6, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          ))}
          <button
            onClick={() => setSavedFlash(true)}
            style={{ width: '100%', padding: '11px', background: savedFlash ? '#1D9E75' : FL_GREEN, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 2 }}>
            {savedFlash ? '✓ Saved' : 'Save Details'}
          </button>
          <div style={{ fontSize: 11, color: '#AAA', marginTop: 6 }}>Details also save automatically as you type. Tap "Save as PDF" above to print or share the report.</div>
        </div>

        {/* Printable report body */}
        <div className="report-page" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ borderBottom: `3px solid ${FL_GREEN}`, paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: FL_GREEN }}>{reportInfo.companyName || 'Inspection Report'}</div>
            <div style={{ fontSize: 12, color: '#555' }}>
              {reportInfo.inspectorName ? reportInfo.inspectorName : ''}{reportInfo.license ? ` · Lic. ${reportInfo.license}` : ''}
            </div>
            <div style={{ fontSize: 13, marginTop: 8, color: '#222' }}>
              {reportInfo.propertyAddress && <div><strong>Property:</strong> {reportInfo.propertyAddress}</div>}
              {reportInfo.clientName && <div><strong>Client:</strong> {reportInfo.clientName}</div>}
              {reportInfo.inspectionDate && <div><strong>Date:</strong> {reportInfo.inspectionDate}</div>}
              {attendeeList.length > 0 && <div><strong>Present at inspection:</strong> {attendeeList.join('; ')}</div>}
            </div>
          </div>

          {coverPhoto && (
            <img src={coverPhoto} alt="Front of house" style={{ width: '100%', maxHeight: 340, objectFit: 'cover', borderRadius: 8, border: '1px solid #E0E0E0', display: 'block', marginBottom: 16 }} />
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: 10, background: '#F5F7F5', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: FL_GREEN }}>{doneSections.length}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Sections inspected</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: 10, background: '#F5F7F5', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: hazards.length ? '#E24B4A' : FL_GREEN }}>{hazards.length}</div>
              <div style={{ fontSize: 11, color: '#888' }}>Safety hazards</div>
            </div>
          </div>

          {FLAG_TYPES.some(fl => sections.some(s => sectionData[s.key]?.[fl.key])) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Findings Summary</div>
              {FLAG_TYPES.map(fl => {
                const list = sections.filter(s => sectionData[s.key]?.[fl.key]);
                if (list.length === 0) return null;
                return (
                  <div key={fl.key} style={{ marginBottom: 10, breakInside: 'avoid' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: fl.color, marginBottom: 3 }}>{fl.icon} {fl.label} ({list.length})</div>
                    {list.map(s => (
                      <div key={s.key} style={{ fontSize: 13, color: fl.color }}>• {s.label}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {doneSections.length === 0 && (
            <div style={{ color: '#888', fontSize: 14 }}>No sections inspected yet. Go back, complete some sections, then return here to generate the report.</div>
          )}

          {doneSections.map(s => {
            const d = sectionData[s.key];
            return (
              <div key={s.key} style={{ marginBottom: 18, breakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E0E0E0', paddingBottom: 4, marginBottom: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{s.icon} {s.label}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {d.conditionRating && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#F5F7F5', color: '#333' }}>{d.conditionRating}</span>}
                    {FLAG_TYPES.filter(fl => d[fl.key]).map(fl => (
                      <span key={fl.key} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: fl.bg, color: fl.color }}>{fl.icon} {fl.label}</span>
                    ))}
                  </div>
                </div>
                {(d.returnTemp || d.supplyTemp) && (
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
                    Return: {d.returnTemp || '—'}°F · Supply: {d.supplyTemp || '—'}°F{d.returnTemp && d.supplyTemp ? ` · Differential ${Math.round((parseFloat(d.returnTemp) - parseFloat(d.supplyTemp)) * 10) / 10}°F` : ''}
                  </div>
                )}
                {d.smokeDetector && <div style={{ fontSize: 12, color: (d.smokeDetector === 'Missing' || d.smokeDetector === 'Present – Not Working') ? '#A32D2D' : '#555', marginBottom: 4 }}>Smoke detector: {d.smokeDetector}</div>}
                {d.notes && <div style={{ fontSize: 13, color: '#222', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{d.notes}</div>}
                {d.photos && d.photos.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {d.photos.map((p, i) => (
                      <img key={i} src={p} alt="" style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #E0E0E0' }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #E0E0E0', fontSize: 11, color: '#888', lineHeight: 1.5 }}>
            This report was prepared by {reportInfo.companyName || '[Company]'} and reflects visible, readily accessible conditions observed at the time of inspection in accordance with the applicable Standards of Practice. It is not a warranty or guarantee of any kind.
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
