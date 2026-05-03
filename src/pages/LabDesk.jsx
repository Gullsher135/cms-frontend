import { useState, useEffect } from 'react';
import { API_BASE, CLINIC_NAME, SOFTWARE_BRANDING } from '../constants';
import { 
  FlaskConical, 
  Plus, 
  DollarSign, 
  Tag, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Microscope,
  Printer,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';

function LabDesk({ cases, onUpdate, catalog, onAddLabTest }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [normalRangeMin, setNormalRangeMin] = useState('');
  const [normalRangeMax, setNormalRangeMax] = useState('');
  const [resultType, setResultType] = useState('numeric');
  const [method, setMethod] = useState('');
  const [localCatalog, setLocalCatalog] = useState(catalog);
  const [pendingResults, setPendingResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultForm, setResultForm] = useState({
    result: '',
    comment: '',
    status: 'in_progress',
    sampleCollectedAt: '',
    sampleReceivedAt: ''
  });

  // Fetch pending lab results
  const fetchPendingResults = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cms_token');
      const res = await fetch(`${API_BASE}/lab-results/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPendingResults(data);
    } catch (err) {
      console.error('Error fetching pending results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingResults();
    const interval = setInterval(fetchPendingResults, 15000);
    return () => clearInterval(interval);
  }, []);

  const refreshCatalog = async () => {
    try {
      const token = localStorage.getItem('cms_token');
      const res = await fetch(`${API_BASE}/catalog/lab-tests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLocalCatalog(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLabTest = async () => {
    if (!name || !price) {
      alert('Please fill name and price');
      return;
    }
    try {
      const token = localStorage.getItem('cms_token');
      const res = await fetch(`${API_BASE}/catalog/lab-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          price: Number(price),
          unit: unit || undefined,
          normalRangeMin: normalRangeMin ? Number(normalRangeMin) : undefined,
          normalRangeMax: normalRangeMax ? Number(normalRangeMax) : undefined,
          resultType,
          method: method || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add test');
      await refreshCatalog();
      // Reset form
      setName('');
      setPrice('');
      setUnit('');
      setNormalRangeMin('');
      setNormalRangeMax('');
      setResultType('numeric');
      setMethod('');
      alert('Test added successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const openResultModal = (pending) => {
    setSelectedResult(pending);
    setResultForm({
      result: pending.existingResult?.result || '',
      comment: pending.existingResult?.comment || '',
      status: pending.existingResult?.status || 'in_progress',
      sampleCollectedAt: pending.existingResult?.sampleCollectedAt ? new Date(pending.existingResult.sampleCollectedAt).toISOString().slice(0, 16) : '',
      sampleReceivedAt: pending.existingResult?.sampleReceivedAt ? new Date(pending.existingResult.sampleReceivedAt).toISOString().slice(0, 16) : ''
    });
    setShowResultModal(true);
  };

  const saveResult = async () => {
    try {
      const token = localStorage.getItem('cms_token');
      const res = await fetch(`${API_BASE}/lab-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          caseId: selectedResult.caseId,
          testId: selectedResult.testId,
          result: resultForm.result,
          comment: resultForm.comment,
          status: resultForm.status,
          sampleCollectedAt: resultForm.sampleCollectedAt || null,
          sampleReceivedAt: resultForm.sampleReceivedAt || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save result');
      alert('Result saved successfully');
      setShowResultModal(false);
      fetchPendingResults();
    } catch (err) {
      alert(err.message);
    }
  };

  const printReport = async (resultId) => {
    const token = localStorage.getItem('cms_token');
    const res = await fetch(`${API_BASE}/lab-results/${resultId}/print`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const html = await res.text();
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const formatPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

  return (
    <div className="lab-desk-upgraded" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        .lab-desk-upgraded .modern-card { background: white; border-radius: 24px; border: 1px solid #e9edf2; transition: all 0.2s ease; }
        .lab-desk-upgraded .form-icon-group { display: flex; align-items: center; gap: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 0.5rem 1rem; transition: all 0.2s; }
        .lab-desk-upgraded .form-icon-group:focus-within { border-color: #0f5ea8; box-shadow: 0 0 0 3px rgba(15,94,168,0.1); }
        .lab-desk-upgraded .form-icon-group input, .lab-desk-upgraded .form-icon-group select { border: none; background: transparent; flex: 1; outline: none; font-size: 0.9rem; padding: 0.2rem 0; }
        .modern-button { border: none; border-radius: 40px; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: all 0.2s; }
        .modern-button-primary { background: linear-gradient(105deg, #0f5ea8, #1b76c8); color: white; box-shadow: 0 2px 6px rgba(15,94,168,0.2); }
        .modern-button-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(15,94,168,0.25); }
        .modern-button-secondary { background: #f1f5f9; color: #1e293b; border: 1px solid #e2e8f0; }
        .modern-button-secondary:hover { background: #e6edf4; }
        .catalog-chip { display: inline-flex; align-items: center; gap: 0.5rem; background: #eef2ff; color: #0f5ea8; border-radius: 40px; padding: 0.3rem 0.8rem; font-size: 0.8rem; font-weight: 500; }
        .status-badge-pending { background: #fef3c7; color: #d97706; padding: 0.2rem 0.6rem; border-radius: 30px; font-size: 0.7rem; font-weight: 600; }
        .pending-card { background: white; border-radius: 20px; border: 1px solid #e9edf2; padding: 1rem; margin-bottom: 0.75rem; transition: all 0.2s; cursor: pointer; }
        .pending-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: #cbd5e1; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal-content { max-width: 600px; width: 90%; max-height: 85vh; overflow-y: auto; background: white; border-radius: 28px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); padding: 1.5rem; }
        .input-group { margin-bottom: 1rem; }
        .input-group label { display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; color: #1e293b; }
        .input-group input, .input-group select, .input-group textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.85rem; transition: all 0.2s; background: white; font-family: inherit; }
        .input-group input:focus, .input-group select:focus, .input-group textarea:focus { outline: none; border-color: #0f5ea8; box-shadow: 0 0 0 3px rgba(15,94,168,0.1); }
      `}</style>

      {/* Header */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ background: '#eef2ff', borderRadius: '18px', padding: '0.5rem' }}>
            <Microscope size={28} color="#0f5ea8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, background: 'linear-gradient(135deg, #0f5ea8, #1b76c8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              LIMS Desk
            </h2>
            <p style={{ margin: '0.2rem 0 0', color: '#5b6e8c' }}>
              Receive lab requests, enter test results, generate reports
            </p>
          </div>
        </div>
      </div>

      {/* Add Test to Catalog Section */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} color="#0f5ea8" /> Add Test to Catalog
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-icon-group"><FlaskConical size={16} /><input placeholder="Test name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="form-icon-group"><DollarSign size={16} /><input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="form-icon-group"><span>Unit</span><input placeholder="Unit (e.g., mg/dL)" value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
          <div className="form-icon-group"><span>Min Ref</span><input placeholder="Min reference" value={normalRangeMin} onChange={(e) => setNormalRangeMin(e.target.value)} /></div>
          <div className="form-icon-group"><span>Max Ref</span><input placeholder="Max reference" value={normalRangeMax} onChange={(e) => setNormalRangeMax(e.target.value)} /></div>
          <div className="form-icon-group">
            <select value={resultType} onChange={(e) => setResultType(e.target.value)}>
              <option value="numeric">Numeric</option>
              <option value="text">Text</option>
              <option value="boolean">Boolean</option>
              <option value="range">Range</option>
            </select>
          </div>
          <div className="form-icon-group"><span>Method</span><input placeholder="Test method (optional)" value={method} onChange={(e) => setMethod(e.target.value)} /></div>
        </div>
        <button type="button" className="modern-button modern-button-secondary" onClick={handleAddLabTest}>
          <Plus size={16} /> Add Test To Catalog
        </button>
      </div>

      {/* Test Catalog Display */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag size={18} color="#0f5ea8" /> Test Catalog
          <span className="catalog-chip" style={{ marginLeft: '0.5rem' }}>{(localCatalog || []).length} tests</span>
        </h3>
        {(localCatalog || []).length === 0 ? (
          <p className="muted" style={{ fontSize: '0.85rem', color: '#5b6e8c' }}>No tests in catalog. Add some using the form above.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(localCatalog || []).map((t, idx) => (
              <span key={idx} className="catalog-chip" title={`${t.unit ? `Unit: ${t.unit}` : ''} ${t.normalRangeMin ? `Ref: ${t.normalRangeMin}-${t.normalRangeMax}` : ''} ${t.method ? `Method: ${t.method}` : ''}`}>
                <FlaskConical size={12} /> {t.name} ({formatPKR(t.price)})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pending Lab Results */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#0f5ea8" /> Pending Lab Tests
          <span className="status-badge-pending" style={{ marginLeft: '0.5rem' }}>{pendingResults.length} pending</span>
        </h3>
        {loading ? <div>Loading...</div> : pendingResults.length === 0 ? (
          <p className="muted">No pending lab tests.</p>
        ) : (
          <div>
            {pendingResults.map((p, idx) => (
              <div key={idx} className="pending-card" onClick={() => openResultModal(p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{p.testName}</strong> – {p.patientName}
                    <div style={{ fontSize: '0.8rem', color: '#5b6e8c' }}>Doctor: {p.doctorName}</div>
                    <div style={{ fontSize: '0.7rem', color: p.existingResult?.status === 'completed' ? '#10b981' : '#f59e0b' }}>
                      Status: {p.existingResult?.status || 'pending'}
                    </div>
                  </div>
                  <button className="modern-button modern-button-primary" style={{ padding: '0.3rem 0.8rem' }}>Enter Result</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Result Entry Modal */}
      {showResultModal && selectedResult && (
        <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Lab Result: {selectedResult.testName}</h3>
              <button onClick={() => setShowResultModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="input-group">
              <label>Patient</label>
              <input type="text" value={`${selectedResult.patientName} (Case ID: ${selectedResult.caseId})`} disabled />
            </div>
            <div className="input-group">
              <label>Result</label>
              <input type="text" value={resultForm.result} onChange={(e) => setResultForm({ ...resultForm, result: e.target.value })} placeholder="Enter result value" />
            </div>
            <div className="input-group">
              <label>Comment / Notes</label>
              <textarea rows="2" value={resultForm.comment} onChange={(e) => setResultForm({ ...resultForm, comment: e.target.value })} placeholder="Add clinical comments" />
            </div>
            <div className="input-group">
              <label>Status</label>
              <select value={resultForm.status} onChange={(e) => setResultForm({ ...resultForm, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="collected">Sample Collected</option>
                <option value="received">Sample Received</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="input-group">
              <label>Sample Collected At</label>
              <input type="datetime-local" value={resultForm.sampleCollectedAt} onChange={(e) => setResultForm({ ...resultForm, sampleCollectedAt: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Sample Received At</label>
              <input type="datetime-local" value={resultForm.sampleReceivedAt} onChange={(e) => setResultForm({ ...resultForm, sampleReceivedAt: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="modern-button modern-button-secondary" onClick={() => setShowResultModal(false)}>Cancel</button>
              <button className="modern-button modern-button-primary" onClick={saveResult}>Save Result</button>
            </div>
            {selectedResult.existingResult?.result && (
              <div className="input-group" style={{ marginTop: '1rem' }}>
                <button className="modern-button modern-button-outline" onClick={() => printReport(selectedResult.existingResult._id)}>
                  <Printer size={14} /> Print Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LabDesk;