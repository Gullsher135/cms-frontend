import { useState } from 'react';
import CaseTable from '../components/CaseTable';
import { API_BASE, CLINIC_NAME, SOFTWARE_BRANDING } from '../constants';
import { 
  Search, 
  SortAsc, 
  SortDesc, 
  Calendar, 
  FileText, 
  Printer, 
  X, 
  Eye, 
  Clock, 
  User, 
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Activity,
  Tag,
  DollarSign,
  AlertCircle
} from 'lucide-react';

function RecordsScreen({ cases, generateBill, getBills, doctors }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [selectedCase, setSelectedCase] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [existingBills, setExistingBills] = useState([]);
  const [viewingBills, setViewingBills] = useState(null);
  const [previewBill, setPreviewBill] = useState(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getBillServices = (bill) => {
    if (Array.isArray(bill.services) && bill.services.length) {
      return bill.services;
    }
    const services = [];
    if (Array.isArray(bill.labTests) && bill.labTests.length) {
      bill.labTests.forEach((test) => {
        services.push({ name: test.name, amount: test.price || 0 });
      });
    }
    if (Array.isArray(bill.medicines) && bill.medicines.length) {
      bill.medicines.forEach((med) => {
        services.push({
          name: `${med.name}${med.quantity ? ` (Qty: ${med.quantity})` : ''}`,
          amount: (med.price || 0) * (med.quantity || 1),
        });
      });
    }
    if (bill.doctorFee != null && bill.billType !== 'services') {
      services.unshift({ name: 'Consultation Fee', amount: bill.doctorFee || 0 });
    }
    return services;
  };

  const getBillTotalAmount = (bill) => {
    if (typeof bill.totalAmount === 'number') return bill.totalAmount;
    if (typeof bill.total === 'number') return bill.total;
    return getBillServices(bill).reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const getBillDateDetails = (bill) => {
    if (bill.appointmentDetails) return bill.appointmentDetails;
    if (bill.serviceDetails) return bill.serviceDetails;
    const sourceDate = bill.generatedAt || bill.collectedAt || bill.createdAt || new Date().toISOString();
    const date = new Date(sourceDate);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      day: date.toLocaleDateString('en-US', { weekday: 'long' }),
    };
  };

  const printThermalReceipt = (element) => {
    if (!element) return;
    const html = `
      <html>
        <head>
          <title>Thermal Receipt</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            html, body { width: 80mm; margin: 0; padding: 0; background: #fff; color: #000; }
            body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.35; }
            * { box-sizing: border-box; }
            .receipt { width: 320px; margin: 0 auto; padding: 10px 12px; color: #000; }
            .receipt .bill-container { border: none; box-shadow: none; margin: 0; }
            .receipt .bill-header { padding: 0; margin: 0 0 10px; background: none; display: block; border-bottom: 1px dashed #000; }
            .receipt .bill-header h3 { margin: 0 0 6px; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; }
            .receipt .bill-header small { display: block; font-size: 10px; color: #333; margin-top: 2px; }
            .receipt .bill-details { padding: 0; }
            .receipt .bill-section { margin-bottom: 10px; }
            .receipt .bill-section h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
            .receipt .bill-section p,
            .receipt .bill-section span {
              margin: 2px 0;
              font-size: 11px;
            }
            .receipt .bill-item,
            .receipt .bill-item-detail {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 11px;
            }
            .receipt .bill-item-divider {
              border-bottom: 1px dashed #999;
              margin: 8px 0;
            }
            .receipt .bill-total {
              display: flex;
              justify-content: space-between;
              padding: 6px 0 2px;
              font-size: 12px;
              font-weight: bold;
              border-top: 1px dashed #000;
            }
            .receipt .bill-footer { text-align: center; margin-top: 10px; font-size: 10px; }
            .receipt .bill-footer p { margin: 3px 0; }
            .receipt .bill-actions,
            .receipt button,
            .receipt .close-btn,
            .receipt .close-bill-btn {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="receipt">${element.innerHTML}</div>
        </body>
      </html>`;
    const printWindow = window.open('', '_blank', 'width=360,height=760');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const loadTimeline = (caseId) => {
    fetch(`${API_BASE}/cases/${caseId}/timeline`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('cms_token') || ''}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSelectedCase(caseId);
        setTimeline(Array.isArray(data) ? data : []);
      });
  };

  const handleGenerateBill = async (caseId, billType) => {
    // First check if there are existing bills for this case
    try {
      const existing = await getBills(caseId);
      if (existing && existing.length > 0) {
        // Show existing bills instead of creating a new one
        setExistingBills(existing);
        setViewingBills(caseId);
        setErrorMsg('This case already has bills. Use View Bills to reprint.');
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }
    } catch (err) {
      console.error('Error checking existing bills:', err);
      // Continue with generation if check fails
    }

    if (loadingBill) return;
    setLoadingBill(true);

    try {
      const caseData = cases.find(c => c._id === caseId);
      if (!caseData) {
        alert('Case not found');
        return;
      }

      const doctor = doctors.find(d => 
        d._id === caseData.doctorId || d.id === caseData.doctorId
      );
      const doctorName = doctor ? doctor.name : (caseData.doctorName || 'Unknown Doctor');
      const consultFee = doctor ? (doctor.consultFee || 0) : 0;

      let billData = {
        caseId,
        patientName: caseData.patientName,
        doctorName: doctorName,
        doctorId: caseData.doctorId,
        billType,
        generatedBy: 'Records Desk',
        generatedAt: new Date().toISOString()
      };

      if (billType === 'services') {
        const services = [];
        if (caseData.recommendedTests?.length > 0) {
          caseData.recommendedTests.forEach((test) => {
            services.push({ name: test.name, amount: test.price || 0 });
          });
        }
        if (caseData.prescriptions?.length > 0) {
          caseData.prescriptions.forEach((med) => {
            services.push({
              name: `${med.name}${med.quantity ? ` (Qty: ${med.quantity})` : ''}`,
              amount: (med.price || 0) * (med.quantity || 1),
            });
          });
        }
        billData.services = services;
        billData.totalAmount = services.reduce((sum, s) => sum + (s.amount || 0), 0);
        billData.title = 'Services Bill';

        const serviceDate = caseData.createdAt ? new Date(caseData.createdAt) : new Date();
        billData.serviceDetails = {
          date: serviceDate.toLocaleDateString(),
          time: serviceDate.toLocaleTimeString(),
          day: serviceDate.toLocaleDateString('en-US', { weekday: 'long' }),
        };
      } else if (billType === 'appointment') {
        billData.services = [{ name: 'Consultation Fee', amount: consultFee }];
        billData.totalAmount = consultFee;
        billData.title = 'Appointment Bill';

        if (caseData.appointmentDate) {
          const appointmentDate = new Date(caseData.appointmentDate);
          let formattedTime = caseData.appointmentTime || '';
          if (caseData.appointmentTime) {
            const timeParts = caseData.appointmentTime.split(':');
            if (timeParts.length >= 2) {
              const date = new Date();
              date.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
              formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }
          billData.appointmentDetails = {
            date: appointmentDate.toLocaleDateString(),
            time: formattedTime,
            day: appointmentDate.toLocaleDateString('en-US', { weekday: 'long' })
          };
        }
      }

      const bill = await generateBill(billData);
      setPreviewBill(bill);
      alert(`${billType === 'services' ? 'Services' : 'Appointment'} bill generated successfully!`);
    } catch (error) {
      alert('Error generating bill: ' + error.message);
    } finally {
      setLoadingBill(false);
    }
  };

  const handleViewBills = async (caseId) => {
    try {
      const bills = await getBills(caseId);
      setExistingBills(bills);
      setViewingBills(caseId);
    } catch (error) {
      alert('Error loading bills: ' + error.message);
    }
  };

  const filtered = cases
    .filter((c) => {
      const t = `${c.patientName} ${c.phone} ${c.cnic} ${c.doctorName}`.toLowerCase();
      return t.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const left = a[sortBy] || '';
      const right = b[sortBy] || '';
      return sortOrder === 'asc'
        ? String(left).localeCompare(String(right))
        : String(right).localeCompare(String(left));
    });
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paged = filtered.slice((page - 1) * limit, page * limit);

  const formatPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

  return (
    <div className="records-screen-upgraded" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .records-screen-upgraded .modern-card {
          background: white;
          border-radius: 24px;
          border: 1px solid #e9edf2;
          transition: all 0.2s ease;
        }
        .records-screen-upgraded .form-icon-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 0.5rem 1rem;
          transition: all 0.2s;
        }
        .records-screen-upgraded .form-icon-group:focus-within {
          border-color: #0f5ea8;
          box-shadow: 0 0 0 3px rgba(15, 94, 168, 0.1);
        }
        .records-screen-upgraded .form-icon-group input,
        .records-screen-upgraded .form-icon-group select {
          border: none;
          background: transparent;
          flex: 1;
          outline: none;
          font-size: 0.9rem;
          padding: 0.2rem 0;
        }
        .modern-button {
          border: none;
          border-radius: 40px;
          padding: 0.6rem 1.2rem;
          font-weight: 600;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modern-button-primary {
          background: linear-gradient(105deg, #0f5ea8, #1b76c8);
          color: white;
          box-shadow: 0 2px 6px rgba(15, 94, 168, 0.2);
        }
        .modern-button-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(15, 94, 168, 0.25);
        }
        .modern-button-secondary {
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }
        .modern-button-secondary:hover {
          background: #e6edf4;
        }
        .modern-button-outline {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #334155;
        }
        .bill-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bill-modal-content {
          max-width: 600px;
          width: 90%;
          max-height: 85vh;
          overflow-y: auto;
          background: white;
          border-radius: 28px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          animation: slideIn 0.3s ease-out;
        }
        .badge-status {
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.2rem 0.6rem;
          border-radius: 30px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .pagination-button {
          padding: 0.4rem 0.8rem;
          border-radius: 40px;
          background: white;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pagination-button:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 1100;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #991b1b;
        }
      `}</style>

      {/* Header */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ background: '#eef2ff', borderRadius: '18px', padding: '0.5rem' }}>
            <FileText size={28} color="#0f5ea8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, background: 'linear-gradient(135deg, #0f5ea8, #1b76c8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Patient Records
            </h2>
            <p style={{ margin: '0.2rem 0 0', color: '#5b6e8c' }}>
              All current and previous cases are preserved and visible here.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <div className="form-icon-group">
            <Search size={16} color="#5b6e8c" />
            <input placeholder="Search patient/doctor/phone/cnic" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="form-icon-group">
            <Tag size={16} color="#5b6e8c" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="createdAt">Created At</option>
              <option value="patientName">Patient Name</option>
              <option value="doctorName">Doctor Name</option>
              <option value="status">Status</option>
            </select>
          </div>
          <div className="form-icon-group">
            {sortOrder === 'desc' ? <SortDesc size={16} /> : <SortAsc size={16} />}
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {errorMsg && (
        <div className="error-toast">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      {/* Cases Table */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <CaseTable 
          cases={paged} 
          onViewTimeline={loadTimeline}
          actions={(caseItem) => (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Generate Bill dropdown - only allow generation if no existing bills? We'll check inside handleGenerateBill */}
              <select 
                className="action-dropdown"
                onChange={(e) => {
                  if (e.target.value) {
                    handleGenerateBill(caseItem.id, e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                disabled={loadingBill}
                style={{ padding: '0.5rem 1rem', borderRadius: '40px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <option value="" disabled>Generate Bill</option>
                <option value="services">Services Bill (Lab & Pharmacy)</option>
                <option value="appointment">Appointment Bill (Consultation)</option>
              </select>
              {/* View Bills button - always visible */}
              <button
                type="button"
                className="modern-button modern-button-secondary"
                onClick={() => handleViewBills(caseItem.id)}
                style={{ padding: '0.5rem 1rem' }}
              >
                <Eye size={14} /> View Bills
              </button>
            </div>
          )}
        />

        {/* Pagination */}
        <div className="pager" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e9edf2' }}>
          <button className="pagination-button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: '0.9rem', color: '#475569' }}>Page {page} of {totalPages}</span>
          <button className="pagination-button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Timeline Section */}
      {selectedCase && (
        <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#0f5ea8" /> Timeline for Case {selectedCase}
            </h3>
            <button className="modern-button modern-button-secondary" onClick={() => setSelectedCase(null)}>Close</button>
          </div>
          <ul className="timeline-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
            {timeline.map((item, idx) => (
              <li key={`${item.at}-${idx}`} style={{ borderLeft: '3px solid #0f5ea8', paddingLeft: '1rem', paddingBottom: '0.5rem' }}>
                <strong>{item.action}</strong>
                <div style={{ fontSize: '0.8rem', color: '#5b6e8c', marginTop: '0.25rem' }}>
                  {new Date(item.at).toLocaleString()} by {item.by} ({item.actorRole})
                </div>
                {item.note && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#334155' }}>{item.note}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Generated Bill Display (inline) */}
      {generatedBill && (
        <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Generated {generatedBill.title || 'Bill'}</h3>
            <button className="modern-button modern-button-secondary" onClick={() => setGeneratedBill(null)}>Close</button>
          </div>
          <div className="bill-card">
            <div className="bill-header">
              <h4>{generatedBill.title || 'Bill'} #{generatedBill.id}</h4>
              <small>Generated on {new Date(generatedBill.generatedAt).toLocaleString()}</small>
            </div>
            <div className="bill-details">
              <p><strong>Patient:</strong> {generatedBill.patientName}</p>
              <p><strong>Doctor:</strong> {generatedBill.doctorName}</p>
              {(generatedBill.appointmentDetails || generatedBill.serviceDetails) && (
                <div className="appointment-info">
                  <h5>{generatedBill.appointmentDetails ? 'Appointment Details:' : 'Service Details:'}</h5>
                  <p><strong>Date:</strong> {(generatedBill.appointmentDetails || generatedBill.serviceDetails)?.date}</p>
                  <p><strong>Time:</strong> {(generatedBill.appointmentDetails || generatedBill.serviceDetails)?.time}</p>
                  <p><strong>Day:</strong> {(generatedBill.appointmentDetails || generatedBill.serviceDetails)?.day}</p>
                </div>
              )}
              <div className="bill-services">
                <h5>Services:</h5>
                {getBillServices(generatedBill).map((service, idx) => (
                  <div key={idx} className="service-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <span>{service.name}</span>
                    <span>{formatPKR(service.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="bill-total" style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                <strong>Total: {formatPKR(getBillTotalAmount(generatedBill))}</strong>
              </div>
            </div>
            <div className="bill-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="modern-button modern-button-primary" onClick={() => setPreviewBill(generatedBill)}><Eye size={14} /> Preview & Print</button>
            </div>
          </div>
        </div>
      )}

      {/* Bills List Modal */}
      {viewingBills && (
        <div className="bill-modal-overlay" onClick={() => setViewingBills(null)}>
          <div className="bill-modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>Bills for Case {viewingBills} - {CLINIC_NAME}</h3>
                <button onClick={() => setViewingBills(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              {existingBills.length === 0 ? (
                <p className="muted" style={{ textAlign: 'center', padding: '2rem', color: '#5b6e8c' }}>No bills found for this case.</p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {existingBills.map((bill) => (
                    <div key={bill._id} className="modern-card" style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem' }}>{bill.title || 'Bill'} #{bill.id || bill._id.slice(-8)}</strong>
                        <span className="badge-status">{new Date(bill.generatedAt).toLocaleDateString()}</span>
                      </div>
                      <p style={{ margin: '0.25rem 0' }}><strong>Patient:</strong> {bill.patientName}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>Doctor:</strong> {bill.doctorName}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>Total:</strong> {formatPKR(getBillTotalAmount(bill))}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="modern-button modern-button-primary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => { setPreviewBill(bill); setViewingBills(null); }}><Eye size={14} /> Preview</button>
                        <button className="modern-button modern-button-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => { setPreviewBill(bill); setViewingBills(null); setTimeout(() => printThermalReceipt(document.querySelector('.printable-bill')), 300); }}><Printer size={14} /> Print</button>
                      </div>
                      <div className="bill-footer" style={{ marginTop: '0.5rem', fontSize: '0.7rem', textAlign: 'center', color: '#5b6e8c' }}>{SOFTWARE_BRANDING}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {previewBill && (
        <div className="bill-modal-overlay" onClick={() => setPreviewBill(null)}>
          <div className="bill-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="bill-preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Bill Preview - {CLINIC_NAME}</h2>
              <button onClick={() => setPreviewBill(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="bill-preview-body" style={{ padding: '1.5rem' }}>
              <div className="printable-bill receipt-card">
                <div className="bill-header" style={{ borderBottom: '2px solid #0f5ea8', marginBottom: '1rem', paddingBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: '#0f5ea8' }}>{CLINIC_NAME}</h3>
                  <small>{previewBill.title || 'Bill'} #{previewBill.id || previewBill._id?.slice(-8)}</small>
                </div>
                
                <div className="bill-details">
                  <div className="bill-section" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#1e293b' }}>Patient Information</h4>
                    <p><strong>Name:</strong> {previewBill.patientName}</p>
                    <p><strong>Phone:</strong> {previewBill.patientPhone || '—'}</p>
                    <p><strong>CNIC:</strong> {previewBill.patientCNIC || '—'}</p>
                  </div>
                  
                  <div className="bill-section" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#1e293b' }}>Doctor Information</h4>
                    <p><strong>Name:</strong> {previewBill.doctorName}</p>
                  </div>

                  {previewBill.appointmentDetails && (
                    <div className="bill-section" style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#1e293b' }}>Appointment Details</h4>
                      <p><strong>Date:</strong> {previewBill.appointmentDetails.date}</p>
                      <p><strong>Time:</strong> {previewBill.appointmentDetails.time}</p>
                      <p><strong>Day:</strong> {previewBill.appointmentDetails.day}</p>
                    </div>
                  )}

                  {previewBill.serviceDetails && (
                    <div className="bill-section" style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#1e293b' }}>Service Details</h4>
                      <p><strong>Date:</strong> {previewBill.serviceDetails.date}</p>
                      <p><strong>Time:</strong> {previewBill.serviceDetails.time}</p>
                      <p><strong>Day:</strong> {previewBill.serviceDetails.day}</p>
                    </div>
                  )}
                  
                  <div className="bill-section">
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#1e293b' }}>Services</h4>
                    <div className="bill-breakdown" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                      {getBillServices(previewBill).map((service, idx) => (
                        <div key={idx} className="bill-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderBottom: idx < getBillServices(previewBill).length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                          <span>{service.name}</span>
                          <span>{formatPKR(service.amount)}</span>
                        </div>
                      ))}
                      <div className="bill-total" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', fontWeight: 'bold' }}>
                        <span><strong>Total Amount</strong></span>
                        <span><strong>{formatPKR(getBillTotalAmount(previewBill))}</strong></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bill-footer" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#5b6e8c' }}>
                    <p><strong>Generated By:</strong> {previewBill.generatedBy || 'Records Desk'}</p>
                    <p><strong>Case ID:</strong> {previewBill.caseId}</p>
                    <p className="bill-thankyou" style={{ marginTop: '0.5rem', color: '#0f5ea8' }}>{SOFTWARE_BRANDING}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bill-preview-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button className="modern-button modern-button-secondary" onClick={() => setPreviewBill(null)}>Close</button>
              <button className="modern-button modern-button-primary" onClick={() => printThermalReceipt(document.querySelector('.printable-bill'))}><Printer size={14} /> Print Bill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordsScreen;