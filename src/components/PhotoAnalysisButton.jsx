// ============================================================
// FieldLensAI — Phase 4: Photo Capture + AI Analysis Button
// File: src/components/PhotoAnalysisButton.jsx
//
// Drop this component into ANY of your 39 inspection sections.
// Usage:
//   <PhotoAnalysisButton
//     sectionKey="roof-covering"
//     inspectorNotes={notes}
//     onResult={(result) => applyToSection(result)}
//   />
// ============================================================
 
import { useState, useRef } from 'react';
import { useAIPhotoAnalysis, getPhotoTypes } from '../hooks/useAIPhotoAnalysis';

// ── Resize/compress large phone photos before upload ──────────
// Phones capture 3–12 MB images. Encoded for the API, that exceeds
// the serverless request size limit and returns HTTP 413. We downscale
// a COPY to a max long edge and re-encode as JPEG so uploads stay small
// and fast. The inspector's workflow is unchanged — they just take a
// normal photo; the shrinking happens automatically in the background.
const MAX_EDGE = 1568;       // Anthropic's recommended max long edge
const JPEG_QUALITY = 0.8;    // good detail, much smaller file

function resizeImageForUpload(file, onDone, onError) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_EDGE || height > MAX_EDGE) {
        if (width >= height) {
          height = Math.round(height * (MAX_EDGE / width));
          width = MAX_EDGE;
        } else {
          width = Math.round(width * (MAX_EDGE / height));
          height = MAX_EDGE;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      onDone({ dataUrl, base64: dataUrl.split(',')[1] });
    };
    img.onerror = onError;
    img.src = ev.target.result;
  };
  reader.onerror = onError;
  reader.readAsDataURL(file);
}
 
export default function PhotoAnalysisButton({ sectionKey, inspectorNotes = '', onResult }) {
  const { analyzePhoto, isAnalyzing } = useAIPhotoAnalysis();
  const [step, setStep] = useState('idle');   // idle | preview | analyzing | results | accepted
  const [photoSrc, setPhotoSrc] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [mediaType, setMediaType] = useState('image/jpeg');
  const [aiResult, setAiResult] = useState(null);
  const [editedWriteUp, setEditedWriteUp] = useState('');
  const [photoType, setPhotoType] = useState(null);
  const fileRef = useRef(null);
  const photoTypes = getPhotoTypes(sectionKey);
 
  // ── Capture photo from camera or gallery ──────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
 
    // media type is set to image/jpeg after resizing (below)
 
    // Downscale + compress the photo, then keep the small copy for
    // both the preview and the AI upload.
    resizeImageForUpload(
      file,
      ({ dataUrl, base64 }) => {
        setMediaType('image/jpeg');
        setPhotoSrc(dataUrl);
        setPhotoBase64(base64);
        setStep('preview');
      },
      (err) => {
        console.error('Image processing failed:', err);
        setStep('error');
      }
    );
  }
 
  // ── Send to Claude Vision ──────────────────────────────────
  async function runAnalysis() {
    setStep('analyzing');
    const guidance = (photoTypes.find(t => t.id === photoType) || {}).guidance || '';
    const result = await analyzePhoto(photoBase64, mediaType, sectionKey, inspectorNotes, guidance);
    if (result.success) {
      setAiResult(result.data);
      setEditedWriteUp(result.data.deficiencyWriteUp);
      setStep('results');
    } else {
      setStep('error');
    }
  }
 
  // ── Inspector accepts the AI finding ──────────────────────
  function handleAccept() {
    const finalResult = {
      ...aiResult,
      deficiencyWriteUp: editedWriteUp,  // use edited version if changed
      photoSrc,
      acceptedAt: new Date().toISOString(),
    };
    onResult?.(finalResult);
    setStep('accepted');
  }
 
  // ── Inspector rejects — reset ──────────────────────────────
  function handleReject() {
    setStep('idle');
    setPhotoSrc(null);
    setPhotoBase64(null);
    setAiResult(null);
    setPhotoType(null);
  }
 
  // ── Condition pill color ───────────────────────────────────
  const conditionStyle = {
    Good:      { bg: '#E1F5EE', color: '#0F6E56' },
    Fair:      { bg: '#FAEEDA', color: '#BA7517' },
    Poor:      { bg: '#FAEEDA', color: '#854F0B' },
    Deficient: { bg: '#FCEBEB', color: '#A32D2D' },
  };
 
  return (
    <div style={{ margin: '12px 0' }}>
 
      {/* ── IDLE: Camera button ── */}
      {step === 'idle' && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            style={styles.cameraBtn}
          >
            📷 Add photo — AI will analyze
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"   // opens rear camera on mobile
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </>
      )}
 
      {/* ── PREVIEW: Confirm before sending ── */}
      {step === 'preview' && (
        <div style={styles.card}>
          <img src={photoSrc} alt="Preview" style={styles.previewImg} />
          {photoTypes.length > 0 && (
            <div style={{ margin: '10px 0 4px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>What does this photo show?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {photoTypes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPhotoType(t.id)}
                    style={{ flex: '1 1 45%', padding: '7px', fontSize: 12, borderRadius: 8, border: `0.5px solid ${photoType === t.id ? '#0F6E56' : '#E0E0E0'}`, background: photoType === t.id ? '#E1F5EE' : '#fff', color: photoType === t.id ? '#0F6E56' : '#555', cursor: 'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={styles.btnRow}>
            <button onClick={handleReject} style={styles.btnSecondary}>Retake</button>
            <button onClick={runAnalysis} style={styles.btnPrimary}>Analyze with AI →</button>
          </div>
        </div>
      )}
 
      {/* ── ANALYZING: Spinner ── */}
      {step === 'analyzing' && (
        <div style={styles.card}>
          <img src={photoSrc} alt="Analyzing" style={{ ...styles.previewImg, opacity: .7 }} />
          <div style={styles.analyzeRow}>
            <div style={styles.spinner} />
            <span style={{ fontSize: 13, color: '#0F6E56', fontWeight: 500 }}>
              Claude Vision is reading your photo...
            </span>
          </div>
        </div>
      )}
 
      {/* ── RESULTS: Accept / Edit / Reject ── */}
      {step === 'results' && aiResult && (
        <div style={styles.card}>
          <img src={photoSrc} alt="Result" style={{ ...styles.previewImg, marginBottom: 10 }} />
 
          {/* Condition + Safety row */}
          <div style={styles.pillRow}>
            <span style={{ ...styles.pill, ...conditionStyle[aiResult.conditionRating] }}>
              {aiResult.conditionRating}
            </span>
            {aiResult.safetyHazard && (
              <span style={{ ...styles.pill, bg: '#FCEBEB', background: '#FCEBEB', color: '#A32D2D' }}>
                ⚠ Safety hazard
              </span>
            )}
            <span style={{ ...styles.pill, background: '#E6F1FB', color: '#185FA5' }}>
              {aiResult.recommendedAction}
            </span>
          </div>
 
          {/* Write-up — editable */}
          <div style={{ marginBottom: 8 }}>
            <div style={styles.fieldLabel}>Deficiency write-up (tap to edit)</div>
            <textarea
              value={editedWriteUp}
              onChange={(e) => setEditedWriteUp(e.target.value)}
              style={styles.textarea}
              rows={4}
            />
          </div>
 
          {/* Forms */}
          <div style={{ marginBottom: 12 }}>
            <div style={styles.fieldLabel}>Auto-fills these Florida forms</div>
            <div style={{ fontSize: 12, color: '#0F6E56' }}>
              {aiResult.floridaForms.join(' · ')}
            </div>
          </div>
 
          {/* Action buttons */}
          <div style={styles.btnRow}>
            <button onClick={handleReject} style={styles.btnReject}>✕ Reject</button>
            <button onClick={() => setStep('results')} style={styles.btnEdit}>✎ Edit</button>
            <button onClick={handleAccept} style={styles.btnAccept}>✓ Accept</button>
          </div>
        </div>
      )}
 
      {/* ── ACCEPTED: Confirmed ── */}
      {step === 'accepted' && (
        <div style={{ ...styles.card, background: '#E1F5EE', borderColor: '#1D9E75' }}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#0F6E56' }}>AI finding added to report</div>
            <div style={{ fontSize: 12, color: '#085041', marginTop: 4 }}>
              {aiResult?.safetyHazard ? '⚠ Safety hazard flagged in red' : 'Finding logged — no safety hazard'}
            </div>
          </div>
          <button onClick={handleReject} style={{ ...styles.btnSecondary, marginTop: 8, width: '100%' }}>
            + Add another photo
          </button>
        </div>
      )}
 
      {/* ── ERROR ── */}
      {step === 'error' && (
        <div style={{ ...styles.card, background: '#FCEBEB', borderColor: '#E24B4A' }}>
          <div style={{ fontSize: 13, color: '#A32D2D', marginBottom: 8 }}>
            AI analysis failed. Check your connection and try again.
          </div>
          <button onClick={handleReject} style={styles.btnSecondary}>Try again</button>
        </div>
      )}
 
    </div>
  );
}
 
// ── Styles ────────────────────────────────────────────────────
const styles = {
  cameraBtn: {
    width: '100%', padding: '12px', fontSize: 14, fontWeight: 500,
    background: 'transparent', border: '1.5px dashed #1D9E75', borderRadius: 10,
    color: '#0F6E56', cursor: 'pointer',
  },
  card: {
    border: '0.5px solid #9FE1CB', borderRadius: 10,
    background: '#fff', padding: 12, overflow: 'hidden',
  },
  previewImg: {
    width: '100%', height: 160, objectFit: 'cover',
    borderRadius: 8, display: 'block',
  },
  btnRow: { display: 'flex', gap: 8, marginTop: 10 },
  btnPrimary: {
    flex: 2, padding: '10px 0', background: '#0F6E56', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  btnSecondary: {
    flex: 1, padding: '10px 0', background: 'transparent',
    border: '0.5px solid #ccc', borderRadius: 8, fontSize: 13, cursor: 'pointer',
  },
  btnAccept: {
    flex: 2, padding: '10px 0', background: '#0F6E56', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  btnEdit: {
    flex: 1, padding: '10px 0', background: '#FAEEDA',
    border: '0.5px solid #EF9F27', borderRadius: 8, fontSize: 13,
    color: '#BA7517', cursor: 'pointer',
  },
  btnReject: {
    flex: 1, padding: '10px 0', background: '#FCEBEB',
    border: '0.5px solid #E24B4A', borderRadius: 8, fontSize: 13,
    color: '#A32D2D', cursor: 'pointer',
  },
  analyzeRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', justifyContent: 'center',
  },
  spinner: {
    width: 20, height: 20, borderRadius: '50%',
    border: '2px solid #E1F5EE', borderTopColor: '#0F6E56',
    animation: 'spin 1s linear infinite',
  },
  pillRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  pill: {
    fontSize: 11, fontWeight: 500, padding: '3px 10px',
    borderRadius: 10, display: 'inline-block',
  },
  fieldLabel: {
    fontSize: 10, fontWeight: 500, color: '#888',
    textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4,
  },
  textarea: {
    width: '100%', fontSize: 13, padding: '8px', borderRadius: 6,
    border: '0.5px solid #ccc', fontFamily: 'inherit',
    resize: 'none', lineHeight: 1.5,
  },
};
 
