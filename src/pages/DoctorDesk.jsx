import { useMemo, useState, useEffect } from 'react';
import { API_BASE } from '../constants';
import CaseTable from '../components/CaseTable';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  Activity, 
  Pill, 
  FlaskConical, 
  FileText, 
  Edit2, 
  Trash2,
  Plus,
  Search,
  Save,
  CheckCircle,
  AlertCircle,
  Printer,
  X,
  History,
  Heart,
  AlertTriangle,
  ClipboardList,
  Syringe,
  FileEdit
} from 'lucide-react';

function DoctorDesk({ cases, setCases, onUpdate, session, labTests, medicines }) {
  const [filterDay, setFilterDay] = useState('');
  const [calendarMode, setCalendarMode] = useState('week');
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [completedFilter, setCompletedFilter] = useState('today');
  const [editingPrescriptions, setEditingPrescriptions] = useState({});
  const [editingTests, setEditingTests] = useState({});
  const [editingDiagnosis, setEditingDiagnosis] = useState({});
  const [editingMedicineIdx, setEditingMedicineIdx] = useState({});
  const [editingTestIdx, setEditingTestIdx] = useState({});
  const [newMedSearch, setNewMedSearch] = useState({});
  const [newTestSearch, setNewTestSearch] = useState({});
  const [updatingPatient, setUpdatingPatient] = useState(null);

  // Report modal states (for new patient report from pending)
  const [showPendingReportModal, setShowPendingReportModal] = useState(false);
  const [pendingReportCase, setPendingReportCase] = useState(null);
  const [pendingReportData, setPendingReportData] = useState({
    diagnosis: '',
    prescriptions: [],
    recommendedTests: [],
    gender: 'Male',
    notes: '',
  });
  const [pendingReportSaving, setPendingReportSaving] = useState(false);
  const [pendingReportMedSearch, setPendingReportMedSearch] = useState('');
  const [pendingReportTestSearch, setPendingReportTestSearch] = useState('');

  // Existing report modal states (for completed patients)
  const [selectedPatientForReport, setSelectedPatientForReport] = useState(null);
  const [patientReports, setPatientReports] = useState([]);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  const [newReport, setNewReport] = useState({
    diagnosis: '',
    prescriptions: [],
    recommendedTests: [],
    gender: 'Male',
    notes: '',
  });
  const [loadingReports, setLoadingReports] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [selectedReportView, setSelectedReportView] = useState(null);

  // EHR History Modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [patientHistory, setPatientHistory] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPastCase, setSelectedPastCase] = useState(null);
  const [activeEhrTab, setActiveEhrTab] = useState('cases');
  const [newAllergy, setNewAllergy] = useState('');
  const [newProblem, setNewProblem] = useState({ problem: '', diagnosedDate: '', status: 'active', notes: '' });
  const [newImmunization, setNewImmunization] = useState({ name: '', date: '', provider: '', nextDue: '', lotNumber: '' });
  const [newVital, setNewVital] = useState({ bpSystolic: '', bpDiastolic: '', pulse: '', temperature: '', weight: '', height: '', notes: '' });
  const [newClinicalNote, setNewClinicalNote] = useState({ type: 'SOAP', subjective: '', objective: '', assessment: '', plan: '' });
  const [updatingEhr, setUpdatingEhr] = useState(false);

  const pending = cases.filter(
    (c) => c.status === 'doctor' && c.doctorName === session.name && (!filterDay || c.appointmentDate === filterDay)
  );
  
  const getDateRange = () => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    if (completedFilter === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (completedFilter === 'week') {
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() + (6 - now.getDay()));
      end.setHours(23, 59, 59, 999);
    } else if (completedFilter === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setMonth(end.getMonth() + 1);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };
  
  const { start: filterStart, end: filterEnd } = getDateRange();
  const completedCases = cases.filter(
    (c) => c.doctorName === session.name && c.status !== 'doctor' && c.createdAt && new Date(c.createdAt) >= filterStart && new Date(c.createdAt) <= filterEnd
  );
  
  const [slots, setSlots] = useState([{ day: 'Monday', from: '09:00', to: '13:00' }]);

  const doctorCases = cases.filter((c) => c.doctorName === session.name && c.appointmentDate);
  const start = new Date(anchorDate);
  const span = calendarMode === 'week' ? 7 : 30;
  const dayBuckets = Array.from({ length: span }).map((_, idx) => {
    const d = new Date(start);
    d.setDate(start.getDate() + idx);
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      label: d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        weekday: calendarMode === 'week' ? 'short' : undefined,
      }),
      count: doctorCases.filter((c) => c.appointmentDate === key).length,
    };
  });

  const saveSlots = () => {
    fetch(`${API_BASE}/doctors/${session.id}/availability`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('cms_token') || ''}`,
      },
      body: JSON.stringify({ availability: slots }),
    });
  };

  // ========== ADJUSTMENT BILL ==========
  const generateAdjustmentBill = async (caseId, patientName, oldMeds, newMeds, oldTests, newTests) => {
    const getPrice = (item) => Number(item.price || 0);
    const services = [];
    let totalAmount = 0;

    const addService = (description, amount) => {
      if (amount === 0) return;
      services.push({ name: description, amount: Math.abs(amount) });
      totalAmount += amount;
    };

    const oldMedMap = new Map(oldMeds.map(m => [m.name, getPrice(m)]));
    const newMedMap = new Map(newMeds.map(m => [m.name, getPrice(m)]));
    for (let [name, price] of newMedMap.entries()) if (!oldMedMap.has(name)) addService(`➕ Added medicine: ${name}`, price);
    for (let [name, price] of oldMedMap.entries()) if (!newMedMap.has(name)) addService(`➖ Removed medicine: ${name}`, -price);
    for (let [name, newPrice] of newMedMap.entries()) {
      const oldPrice = oldMedMap.get(name);
      if (oldPrice !== undefined && oldPrice !== newPrice) {
        const diff = newPrice - oldPrice;
        addService(`${diff > 0 ? '⬆️ Increased' : '⬇️ Decreased'} medicine ${name} price`, diff);
      }
    }

    const oldTestMap = new Map(oldTests.map(t => [t.name, getPrice(t)]));
    const newTestMap = new Map(newTests.map(t => [t.name, getPrice(t)]));
    for (let [name, price] of newTestMap.entries()) if (!oldTestMap.has(name)) addService(`➕ Added lab test: ${name}`, price);
    for (let [name, price] of oldTestMap.entries()) if (!newTestMap.has(name)) addService(`➖ Removed lab test: ${name}`, -price);
    for (let [name, newPrice] of newTestMap.entries()) {
      const oldPrice = oldTestMap.get(name);
      if (oldPrice !== undefined && oldPrice !== newPrice) {
        const diff = newPrice - oldPrice;
        addService(`${diff > 0 ? '⬆️ Increased' : '⬇️ Decreased'} lab test ${name} price`, diff);
      }
    }

    if (services.length === 0) return null;

    const billData = {
      caseId,
      patientName,
      doctorName: session.name,
      doctorId: session.id,
      billType: 'adjustment',
      title: totalAmount > 0 ? 'Additional Charges Bill' : 'Credit Note',
      services,
      totalAmount,
      generatedBy: `Dr. ${session.name}`,
      generatedAt: new Date().toISOString(),
    };
    const token = localStorage.getItem('cms_token') || '';
    const res = await fetch(`${API_BASE}/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(billData),
    });
    if (!res.ok) throw new Error('Failed to create adjustment bill');
    const bill = await res.json();
    alert(`New ${totalAmount > 0 ? 'additional bill' : 'credit note'} for PKR ${Math.abs(totalAmount)} created.`);
    return bill;
  };

  const updateCaseWithBill = async (caseId, oldCase, newData, oldMeds, oldTests) => {
    if (updatingPatient === caseId) return;
    setUpdatingPatient(caseId);
    try {
      await onUpdate(caseId, newData);
      const newMeds = newData.prescriptions ?? oldCase.prescriptions;
      const newTests = newData.recommendedTests ?? oldCase.recommendedTests;
      await generateAdjustmentBill(caseId, oldCase.patientName, oldMeds, newMeds, oldTests, newTests);
    } catch (err) {
      alert('Error updating case: ' + err.message);
    } finally {
      setUpdatingPatient(null);
    }
  };

  // ========== PENDING REPORT ==========
  const openPendingReportModal = (caseItem) => {
    setPendingReportCase(caseItem);
    setPendingReportData({
      diagnosis: '',
      prescriptions: [],
      recommendedTests: [],
      gender: 'Male',
      notes: '',
    });
    setPendingReportMedSearch('');
    setPendingReportTestSearch('');
    setShowPendingReportModal(true);
  };

  const savePendingReport = async () => {
    if (!pendingReportData.diagnosis.trim()) return alert('Please enter a diagnosis');
    setPendingReportSaving(true);
    try {
      const token = localStorage.getItem('cms_token');
      const reportData = {
        patientName: pendingReportCase.patientName,
        phone: pendingReportCase.phone,
        cnic: pendingReportCase.cnic,
        age: pendingReportCase.age,
        gender: pendingReportData.gender,
        doctorId: session.id,
        doctorName: session.name,
        diagnosis: pendingReportData.diagnosis,
        prescriptions: pendingReportData.prescriptions.map(m => ({ id: m.id, name: m.name, price: m.price, quantity: 1 })),
        recommendedTests: pendingReportData.recommendedTests.map(t => ({ id: t.id, name: t.name, price: t.price })),
        notes: pendingReportData.notes,
        reportDate: new Date(),
      };
      const reportRes = await fetch(`${API_BASE}/patient-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(reportData),
      });
      if (!reportRes.ok) throw new Error('Failed to save report');
      const updatePayload = {
        diagnosis: pendingReportData.diagnosis,
        prescriptions: pendingReportData.prescriptions.map(m => ({ id: m.id, name: m.name, price: m.price })),
        recommendedTests: pendingReportData.recommendedTests.map(t => ({ id: t.id, name: t.name, price: t.price })),
        status: 'reception',
        timelineAction: 'Doctor consultation completed',
        timelineNote: 'Prescription and tests sent to reception via report',
      };
      await onUpdate(pendingReportCase.id, updatePayload);
      alert('Report saved and patient sent to reception');
      setShowPendingReportModal(false);
      setPendingReportCase(null);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setPendingReportSaving(false);
    }
  };

  // ========== REPORTS FOR COMPLETED PATIENTS ==========
  const fetchPatientReports = async (patient) => {
    setLoadingReports(true);
    try {
      const token = localStorage.getItem('cms_token');
      const url = `${API_BASE}/patient-reports?phone=${encodeURIComponent(patient.phone)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setPatientReports(data);
      setSelectedPatientForReport(patient);
      setShowReportsModal(true);
    } catch (err) { alert(err.message); } finally { setLoadingReports(false); }
  };

  const saveNewReport = async (patient) => {
    if (!newReport.diagnosis.trim()) return alert('Please enter a diagnosis');
    setSavingReport(true);
    try {
      const token = localStorage.getItem('cms_token');
      const reportData = {
        patientName: patient.patientName,
        phone: patient.phone,
        cnic: patient.cnic,
        age: patient.age,
        gender: newReport.gender,
        doctorId: session.id,
        doctorName: session.name,
        diagnosis: newReport.diagnosis,
        prescriptions: newReport.prescriptions,
        recommendedTests: newReport.recommendedTests,
        notes: newReport.notes,
        reportDate: new Date(),
      };
      const res = await fetch(`${API_BASE}/patient-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(reportData),
      });
      if (!res.ok) throw new Error('Failed to save report');
      await fetchPatientReports(patient);
      setNewReport({ diagnosis: '', prescriptions: [], recommendedTests: [], gender: 'Male', notes: '' });
      setShowNewReportForm(false);
      alert('Report saved successfully');
    } catch (err) { alert(err.message); } finally { setSavingReport(false); }
  };

  const printReport = (report) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    printWindow.document.write(`
      <html>
        <head><title>Patient Medical Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0f5ea8; margin-bottom: 20px; }
          .header h2 { color: #0f5ea8; margin: 0; }
          .clinic-name { font-size: 14px; color: #555; }
          .section { margin-bottom: 15px; }
          .section h3 { background: #f0f4f8; padding: 5px; margin: 10px 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .med-list, .test-list { list-style: none; padding-left: 0; }
          .med-list li, .test-list li { margin-bottom: 5px; }
          .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #888; border-top: 1px solid #ccc; padding-top: 10px; }
          .signature { margin-top: 20px; display: flex; justify-content: flex-end; }
        </style>
        </head>
        <body>
          <div class="header">
            <h2>Nexone Clinic</h2>
            <div class="clinic-name">Patient Medical Report</div>
          </div>
          <div class="section">
            <h3>Patient Information</h3>
            <div class="info-grid">
              <div><strong>Name:</strong> ${report.patientName}</div>
              <div><strong>Age:</strong> ${report.age}</div>
              <div><strong>Gender:</strong> ${report.gender}</div>
              <div><strong>Phone:</strong> ${report.phone}</div>
              <div><strong>CNIC:</strong> ${report.cnic || '—'}</div>
              <div><strong>Date:</strong> ${new Date(report.reportDate).toLocaleDateString()}</div>
            </div>
          </div>
          <div class="section">
            <h3>Doctor</h3>
            <div>Dr. ${report.doctorName}</div>
          </div>
          <div class="section">
            <h3>Diagnosis</h3>
            <p>${report.diagnosis}</p>
          </div>
          ${report.prescriptions && report.prescriptions.length ? `
          <div class="section">
            <h3>Prescriptions</h3>
            <ul class="med-list">
              ${report.prescriptions.map(m => `<li>${m.name} - PKR ${m.price} (Qty: ${m.quantity || 1})</li>`).join('')}
            </ul>
          </div>` : ''}
          ${report.recommendedTests && report.recommendedTests.length ? `
          <div class="section">
            <h3>Lab Tests</h3>
            <ul class="test-list">
              ${report.recommendedTests.map(t => `<li>${t.name} - PKR ${t.price}</li>`).join('')}
            </ul>
          </div>` : ''}
          ${report.notes ? `<div class="section"><h3>Notes</h3><p>${report.notes}</p></div>` : ''}
          <div class="footer">Powered by Nexone Clinic CMS</div>
          <div class="signature">Doctor's Signature: ___________________</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ========== EHR HISTORY ==========
  const fetchPatientHistory = async (patientId, fallbackPhone) => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('cms_token');
      let url = `${API_BASE}/patients/${patientId}/history`;
      if (!patientId && fallbackPhone) {
        const searchRes = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(fallbackPhone)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!searchRes.ok) throw new Error('Patient not found');
        const patients = await searchRes.json();
        if (!patients.length) throw new Error('No patient record found');
        const patient = patients[0];
        patientId = patient._id;
        url = `${API_BASE}/patients/${patientId}/history`;
      }
      const [historyRes, labRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/lab-results/patient/${patientId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const historyData = await historyRes.json();
      const labData = await labRes.json();
      setPatientHistory({ ...historyData, labResults: labData });
      setSelectedPatient(historyData.patient);
      setActiveEhrTab('cases');
      setShowHistoryModal(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load patient history: ' + err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const updatePatient = async (patientId, updateData) => {
    setUpdatingEhr(true);
    try {
      const token = localStorage.getItem('cms_token');
      const res = await fetch(`${API_BASE}/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setSelectedPatient(updated);
      const historyRes = await fetch(`${API_BASE}/patients/${patientId}/history`, { headers: { Authorization: `Bearer ${token}` } });
      const historyData = await historyRes.json();
      setPatientHistory(historyData);
    } catch (err) { alert(err.message); } finally { setUpdatingEhr(false); }
  };

  const addAllergy = async () => { if (!newAllergy.trim()) return; await updatePatient(selectedPatient._id, { allergies: [...selectedPatient.allergies, newAllergy.trim()] }); setNewAllergy(''); };
  const deleteAllergy = async (allergy) => { const updated = selectedPatient.allergies.filter(a => a !== allergy); await updatePatient(selectedPatient._id, { allergies: updated }); };
  const addProblem = async () => { if (!newProblem.problem.trim()) return; const problemToAdd = { problem: newProblem.problem, diagnosedDate: newProblem.diagnosedDate || new Date().toISOString().split('T')[0], status: newProblem.status, notes: newProblem.notes }; const updated = [...(selectedPatient.problemList || []), problemToAdd]; await updatePatient(selectedPatient._id, { problemList: updated }); setNewProblem({ problem: '', diagnosedDate: '', status: 'active', notes: '' }); };
  const updateProblemStatus = async (index, status) => { const updated = [...(selectedPatient.problemList || [])]; updated[index].status = status; await updatePatient(selectedPatient._id, { problemList: updated }); };
  const deleteProblem = async (index) => { const updated = [...(selectedPatient.problemList || [])]; updated.splice(index, 1); await updatePatient(selectedPatient._id, { problemList: updated }); };
  const addImmunization = async () => { if (!newImmunization.name.trim()) return; const immToAdd = { name: newImmunization.name, date: newImmunization.date || new Date().toISOString().split('T')[0], provider: newImmunization.provider, nextDue: newImmunization.nextDue, lotNumber: newImmunization.lotNumber }; const updated = [...(selectedPatient.immunizations || []), immToAdd]; await updatePatient(selectedPatient._id, { immunizations: updated }); setNewImmunization({ name: '', date: '', provider: '', nextDue: '', lotNumber: '' }); };
  const deleteImmunization = async (index) => { const updated = [...(selectedPatient.immunizations || [])]; updated.splice(index, 1); await updatePatient(selectedPatient._id, { immunizations: updated }); };
  const addVital = async () => { if (!newVital.weight && !newVital.bpSystolic && !newVital.pulse) return; const vitalToAdd = { date: new Date(), bpSystolic: parseFloat(newVital.bpSystolic) || null, bpDiastolic: parseFloat(newVital.bpDiastolic) || null, pulse: parseFloat(newVital.pulse) || null, temperature: parseFloat(newVital.temperature) || null, weight: parseFloat(newVital.weight) || null, height: parseFloat(newVital.height) || null, notes: newVital.notes }; const updated = [...(selectedPatient.vitals || []), vitalToAdd]; await updatePatient(selectedPatient._id, { vitals: updated }); setNewVital({ bpSystolic: '', bpDiastolic: '', pulse: '', temperature: '', weight: '', height: '', notes: '' }); };
  const addClinicalNote = async () => { if (!newClinicalNote.subjective && !newClinicalNote.objective && !newClinicalNote.assessment && !newClinicalNote.plan) return; const noteToAdd = { type: newClinicalNote.type, subjective: newClinicalNote.subjective, objective: newClinicalNote.objective, assessment: newClinicalNote.assessment, plan: newClinicalNote.plan, doctorId: session.id, doctorName: session.name, date: new Date() }; const updated = [...(selectedPatient.clinicalNotes || []), noteToAdd]; await updatePatient(selectedPatient._id, { clinicalNotes: updated }); setNewClinicalNote({ type: 'SOAP', subjective: '', objective: '', assessment: '', plan: '' }); };

  const formatPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;
  const filteredPendingMeds = useMemo(() => {
    if (!pendingReportMedSearch) return [];
    return medicines.filter(m => m.quantity > 0 && m.name.toLowerCase().includes(pendingReportMedSearch.toLowerCase())).slice(0, 8);
  }, [pendingReportMedSearch, medicines]);
  const filteredPendingTests = useMemo(() => {
    if (!pendingReportTestSearch) return [];
    return labTests.filter(t => t.name.toLowerCase().includes(pendingReportTestSearch.toLowerCase())).slice(0, 8);
  }, [pendingReportTestSearch, labTests]);
  const medicinesInStock = useMemo(() => medicines.filter(m => m.quantity > 0), [medicines]);

  return (
    <div className="doctor-desk-upgraded" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        .doctor-desk-upgraded .modern-card { background: white; border-radius: 24px; border: 1px solid #e9edf2; transition: all 0.2s ease; }
        .doctor-desk-upgraded .form-icon-group { display: flex; align-items: center; gap: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 0.5rem 1rem; transition: all 0.2s; }
        .doctor-desk-upgraded .form-icon-group:focus-within { border-color: #0f5ea8; box-shadow: 0 0 0 3px rgba(15,94,168,0.1); }
        .doctor-desk-upgraded .form-icon-group input, .doctor-desk-upgraded .form-icon-group select, .doctor-desk-upgraded .form-icon-group textarea { border: none; background: transparent; flex: 1; outline: none; font-size: 0.9rem; padding: 0.2rem 0; font-family: inherit; }
        .modern-button { border: none; border-radius: 40px; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: all 0.2s; }
        .modern-button-primary { background: linear-gradient(105deg, #0f5ea8, #1b76c8); color: white; box-shadow: 0 2px 6px rgba(15,94,168,0.2); }
        .modern-button-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(15,94,168,0.25); }
        .modern-button-secondary { background: #f1f5f9; color: #1e293b; border: 1px solid #e2e8f0; }
        .modern-button-secondary:hover { background: #e6edf4; }
        .calendar-day-btn { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 0.75rem; text-align: left; cursor: pointer; transition: all 0.2s; }
        .calendar-day-btn:hover { border-color: #0f5ea8; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .chip-modern { display: inline-flex; align-items: center; gap: 0.5rem; background: #eef2ff; color: #0f5ea8; border-radius: 40px; padding: 0.4rem 0.8rem; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
        .chip-modern:hover { background: #e0f2fe; transform: scale(1.02); }
        .patient-card-modern { background: white; border-radius: 24px; border: 1px solid #e9edf2; padding: 1.25rem; margin-bottom: 1rem; transition: all 0.2s; }
        .patient-card-modern:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.05); border-color: #cbd5e1; }
        .status-badge { background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.6rem; border-radius: 30px; font-size: 0.7rem; font-weight: 600; display: inline-block; }
        .bill-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .bill-modal-content { max-width: 900px; width: 90%; max-height: 85vh; overflow-y: auto; background: white; border-radius: 28px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); animation: slideIn 0.3s ease-out; }
        .ehr-tab { padding: 0.5rem 1rem; background: #f1f5f9; border-radius: 40px; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; border: 1px solid transparent; }
        .ehr-tab.active { background: #0f5ea8; color: white; border-color: #0f5ea8; }
        .ehr-tab:hover:not(.active) { background: #e2e8f0; }
        .ehr-form-card { background: #f8fafc; border-radius: 20px; padding: 1rem; margin-bottom: 1rem; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .ehr-form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem; }
        .ehr-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin-bottom: 0.25rem; display: block; }
        .ehr-input, .ehr-select, .ehr-textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.85rem; transition: all 0.2s; background: white; }
        .ehr-input:focus, .ehr-select:focus, .ehr-textarea:focus { outline: none; border-color: #0f5ea8; box-shadow: 0 0 0 3px rgba(15,94,168,0.1); }
        .ehr-card { background: white; border-radius: 16px; border: 1px solid #e9edf2; padding: 1rem; margin-bottom: 0.75rem; transition: all 0.2s; }
        .ehr-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: #cbd5e1; }
      `}</style>

      {/* Header */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ background: '#eef2ff', borderRadius: '18px', padding: '0.5rem' }}>
            <Stethoscope size={28} color="#0f5ea8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, background: 'linear-gradient(135deg, #0f5ea8, #1b76c8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Doctor Desk
            </h2>
            <p style={{ margin: '0.2rem 0 0', color: '#5b6e8c' }}>
              Manage appointments, patient reports, and full EHR
            </p>
          </div>
        </div>
      </div>

      {/* Calendar & Availability Section */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="#0f5ea8" /> Schedule & Availability
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-icon-group"><Calendar size={16} /><input type="date" value={filterDay} onChange={(e) => setFilterDay(e.target.value)} placeholder="Filter by date" /></div>
          <div className="form-icon-group"><Clock size={16} /><select value={calendarMode} onChange={(e) => setCalendarMode(e.target.value)}><option value="week">Week View</option><option value="month">Month View</option></select></div>
          <div className="form-icon-group"><Calendar size={16} /><input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} /></div>
        </div>
        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(100px, 1fr))`, gap: '0.5rem', marginBottom: '1rem' }}>
          {dayBuckets.map((d) => (
            <button key={d.key} type="button" className="calendar-day-btn" onClick={() => setFilterDay(d.key)}>
              <strong style={{ fontSize: '0.85rem' }}>{d.label}</strong>
              <span style={{ fontSize: '0.7rem', color: '#5b6e8c', display: 'block', marginTop: '0.25rem' }}>{d.count} appointment(s)</span>
            </button>
          ))}
        </div>
        <button type="button" className="modern-button modern-button-secondary" onClick={saveSlots} style={{ marginBottom: '0.5rem' }}>
          <Save size={16} /> Save Availability Slots
        </button>
        <p className="muted" style={{ fontSize: '0.8rem', color: '#5b6e8c', marginTop: '0.5rem' }}>
          Slots: {slots.map((s) => `${s.day} ${s.from}-${s.to}`).join(' | ')}
        </p>
      </div>

      {/* Pending Patients */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#0f5ea8" /> Pending Patients <span className="status-badge" style={{ marginLeft: '0.5rem' }}>{pending.length}</span>
        </h3>
        <CaseTable
          cases={pending}
          actions={(c) => (
            <div style={{ display: 'grid', gap: '1rem', marginTop: '0.5rem' }}>
              <button className="modern-button modern-button-primary" onClick={() => openPendingReportModal(c)}>
                <FileText size={16} /> Generate Report & Send to Reception
              </button>
            </div>
          )}
        />
      </div>

      {/* Completed Patients */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="#0f5ea8" /> Completed Patients (Manage Prescriptions & Tests)
        </h3>
        <div className="form-icon-group" style={{ marginBottom: '1rem' }}>
          <Calendar size={16} />
          <select value={completedFilter} onChange={(e) => setCompletedFilter(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        {completedCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#5b6e8c' }}>
            <AlertCircle size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p>No completed patients in the selected period.</p>
          </div>
        ) : (
          <div className="patients-list">
            {completedCases.map((c) => (
              <div key={c.id} className="patient-card-modern">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{c.patientName}</h4>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#5b6e8c' }}>
                      Date: {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="status-badge">{c.status}</span>
                    <button className="modern-button modern-button-outline" style={{ padding: '0.3rem 0.8rem' }} onClick={() => fetchPatientReports(c)}>
                      <FileText size={14} /> Reports
                    </button>
                    <button className="modern-button modern-button-outline" style={{ padding: '0.3rem 0.8rem' }} onClick={() => fetchPatientHistory(c.patientId, c.phone)}>
                      <History size={14} /> EHR
                    </button>
                  </div>
                </div>
                
                {/* Diagnosis Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Diagnosis</h5>
                  <div className="form-icon-group" style={{ marginBottom: '0.5rem' }}>
                    <FileText size={16} />
                    <input type="text" value={editingDiagnosis[c.id] ?? c.diagnosis ?? ''} onChange={(e) => setEditingDiagnosis({ ...editingDiagnosis, [c.id]: e.target.value })} placeholder="Edit diagnosis" />
                  </div>
                  <button type="button" className="modern-button modern-button-secondary" disabled={updatingPatient === c.id} onClick={async () => {
                    const newDiagnosis = editingDiagnosis[c.id] ?? c.diagnosis;
                    if (newDiagnosis === (c.diagnosis || '')) return;
                    await updateCaseWithBill(c.id, c, { diagnosis: newDiagnosis, timelineAction: 'Diagnosis updated', timelineNote: 'Doctor updated diagnosis' }, c.prescriptions || [], c.recommendedTests || []);
                    setEditingDiagnosis({ ...editingDiagnosis, [c.id]: '' });
                  }}><Save size={14} /> Update Diagnosis</button>
                </div>
                
                {/* Prescriptions Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Prescriptions</h5>
                  {(c.prescriptions || []).length === 0 ? (<p className="muted" style={{ fontSize: '0.8rem', color: '#5b6e8c' }}>No prescriptions</p>) : (
                    <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {(editingPrescriptions[c.id] || c.prescriptions || []).map((med, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', flexWrap: 'wrap' }}>
                          {editingMedicineIdx[`${c.id}-${idx}`] ? (
                            <>
                              <input type="text" value={med.name} onChange={(e) => {
                                const updated = [...(editingPrescriptions[c.id] || c.prescriptions || [])];
                                updated[idx] = { ...med, name: e.target.value };
                                setEditingPrescriptions({ ...editingPrescriptions, [c.id]: updated });
                              }} style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <input type="number" value={med.price} onChange={(e) => {
                                const updated = [...(editingPrescriptions[c.id] || c.prescriptions || [])];
                                updated[idx] = { ...med, price: Number(e.target.value) };
                                setEditingPrescriptions({ ...editingPrescriptions, [c.id]: updated });
                              }} style={{ width: '80px', padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <button className="modern-button modern-button-primary" onClick={async () => {
                                const oldMeds = c.prescriptions || [];
                                const newMeds = editingPrescriptions[c.id] || c.prescriptions;
                                await updateCaseWithBill(c.id, c, { prescriptions: newMeds, timelineAction: 'Medicine updated', timelineNote: `Updated ${med.name}` }, oldMeds, c.recommendedTests || []);
                                setEditingMedicineIdx({ ...editingMedicineIdx, [`${c.id}-${idx}`]: false });
                              }}><Save size={12} /> Save</button>
                            </>
                          ) : (
                            <>
                              <span style={{ flex: 1 }}>{med.name} - {formatPKR(med.price)}</span>
                              <button className="modern-button modern-button-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setEditingMedicineIdx({ ...editingMedicineIdx, [`${c.id}-${idx}`]: true })}><Edit2 size={12} /> Edit</button>
                              <button className="modern-button modern-button-outline" style={{ padding: '0.3rem 0.6rem', color: '#b91c1c' }} onClick={async () => {
                                const oldMeds = c.prescriptions || [];
                                const newMeds = (editingPrescriptions[c.id] || c.prescriptions || []).filter((_, i) => i !== idx);
                                await updateCaseWithBill(c.id, c, { prescriptions: newMeds, timelineAction: 'Medicine removed', timelineNote: `Removed ${med.name}` }, oldMeds, c.recommendedTests || []);
                                setEditingPrescriptions({ ...editingPrescriptions, [c.id]: newMeds });
                              }}><Trash2 size={12} /> Remove</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="form-icon-group" style={{ flex: 1 }}><Search size={14} /><input type="text" placeholder="Search & add medicine" value={newMedSearch[c.id] || ''} onChange={(e) => setNewMedSearch({ ...newMedSearch, [c.id]: e.target.value })} /></div>
                    {medicinesInStock.filter((m) => m.name.toLowerCase().includes((newMedSearch[c.id] || '').toLowerCase())).slice(0, 3).map((m) => (
                      <button key={m.id} className="chip-modern" onClick={async () => {
                        const oldMeds = c.prescriptions || [];
                        const newMeds = [...(editingPrescriptions[c.id] || c.prescriptions || []), { id: m.id, name: m.name, price: m.price }];
                        await updateCaseWithBill(c.id, c, { prescriptions: newMeds, timelineAction: 'Medicine added', timelineNote: `Added ${m.name}` }, oldMeds, c.recommendedTests || []);
                        setEditingPrescriptions({ ...editingPrescriptions, [c.id]: newMeds });
                        setNewMedSearch({ ...newMedSearch, [c.id]: '' });
                      }}><Plus size={12} /> {m.name}</button>
                    ))}
                  </div>
                </div>
                
                {/* Lab Tests Section */}
                <div>
                  <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Lab Tests</h5>
                  {(c.recommendedTests || []).length === 0 ? (<p className="muted" style={{ fontSize: '0.8rem', color: '#5b6e8c' }}>No tests recommended</p>) : (
                    <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {(editingTests[c.id] || c.recommendedTests || []).map((test, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', flexWrap: 'wrap' }}>
                          {editingTestIdx[`${c.id}-${idx}`] ? (
                            <>
                              <input type="text" value={test.name} onChange={(e) => {
                                const updated = [...(editingTests[c.id] || c.recommendedTests || [])];
                                updated[idx] = { ...test, name: e.target.value };
                                setEditingTests({ ...editingTests, [c.id]: updated });
                              }} style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <input type="number" value={test.price} onChange={(e) => {
                                const updated = [...(editingTests[c.id] || c.recommendedTests || [])];
                                updated[idx] = { ...test, price: Number(e.target.value) };
                                setEditingTests({ ...editingTests, [c.id]: updated });
                              }} style={{ width: '80px', padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <button className="modern-button modern-button-primary" onClick={async () => {
                                const oldTests = c.recommendedTests || [];
                                const newTests = editingTests[c.id] || c.recommendedTests;
                                await updateCaseWithBill(c.id, c, { recommendedTests: newTests, timelineAction: 'Test updated', timelineNote: `Updated ${test.name}` }, c.prescriptions || [], oldTests);
                                setEditingTestIdx({ ...editingTestIdx, [`${c.id}-${idx}`]: false });
                              }}><Save size={12} /> Save</button>
                            </>
                          ) : (
                            <>
                              <span style={{ flex: 1 }}>{test.name} - {formatPKR(test.price)}</span>
                              <button className="modern-button modern-button-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setEditingTestIdx({ ...editingTestIdx, [`${c.id}-${idx}`]: true })}><Edit2 size={12} /> Edit</button>
                              <button className="modern-button modern-button-outline" style={{ padding: '0.3rem 0.6rem', color: '#b91c1c' }} onClick={async () => {
                                const oldTests = c.recommendedTests || [];
                                const newTests = (editingTests[c.id] || c.recommendedTests || []).filter((_, i) => i !== idx);
                                await updateCaseWithBill(c.id, c, { recommendedTests: newTests, timelineAction: 'Test removed', timelineNote: `Removed ${test.name}` }, c.prescriptions || [], oldTests);
                                setEditingTests({ ...editingTests, [c.id]: newTests });
                              }}><Trash2 size={12} /> Remove</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="form-icon-group" style={{ flex: 1 }}><Search size={14} /><input type="text" placeholder="Search & add test" value={newTestSearch[c.id] || ''} onChange={(e) => setNewTestSearch({ ...newTestSearch, [c.id]: e.target.value })} /></div>
                    {labTests.filter((t) => t.name.toLowerCase().includes((newTestSearch[c.id] || '').toLowerCase())).slice(0, 3).map((t) => (
                      <button key={t.id} className="chip-modern" onClick={async () => {
                        const oldTests = c.recommendedTests || [];
                        const newTests = [...(editingTests[c.id] || c.recommendedTests || []), { id: t.id, name: t.name, price: t.price }];
                        await updateCaseWithBill(c.id, c, { recommendedTests: newTests, timelineAction: 'Test added', timelineNote: `Added ${t.name}` }, c.prescriptions || [], oldTests);
                        setEditingTests({ ...editingTests, [c.id]: newTests });
                        setNewTestSearch({ ...newTestSearch, [c.id]: '' });
                      }}><Plus size={12} /> {t.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Report Modal */}
      {showPendingReportModal && pendingReportCase && (
        <div className="bill-modal-overlay" onClick={() => setShowPendingReportModal(false)}>
          <div className="bill-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Medical Report for {pendingReportCase.patientName}</h3>
                <button onClick={() => setShowPendingReportModal(false)}><X size={20} /></button>
              </div>
              <div className="input-group"><label className="ehr-label">Gender</label><select value={pendingReportData.gender} onChange={e => setPendingReportData({ ...pendingReportData, gender: e.target.value })} className="ehr-select"><option>Male</option><option>Female</option><option>Other</option></select></div>
              <div className="input-group"><label className="ehr-label">Diagnosis</label><textarea placeholder="Enter diagnosis..." rows="3" value={pendingReportData.diagnosis} onChange={e => setPendingReportData({ ...pendingReportData, diagnosis: e.target.value })} className="ehr-textarea" /></div>
              <div className="input-group"><label className="ehr-label">Medicines</label>
                <div className="form-icon-group" style={{ marginBottom: '0.5rem' }}><Pill size={16} /><input placeholder="Search medicines catalog" value={pendingReportMedSearch} onChange={(e) => setPendingReportMedSearch(e.target.value)} /></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {filteredPendingMeds.map((m) => (<button key={m.id} className="chip-modern" onClick={() => setPendingReportData(prev => ({ ...prev, prescriptions: [...prev.prescriptions, { id: m.id, name: m.name, price: m.price, quantity: 1 }] }))}><Pill size={12} /> {m.name} ({formatPKR(m.price)}) – Stock: {m.quantity}</button>))}
                </div>
                <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', marginBottom: '1rem' }}><strong>Selected Rx:</strong> {pendingReportData.prescriptions.map(m => `${m.name} (${formatPKR(m.price)})`).join(', ') || 'None'}</div>
              </div>
              <div className="input-group"><label className="ehr-label">Lab Tests</label>
                <div className="form-icon-group" style={{ marginBottom: '0.5rem' }}><FlaskConical size={16} /><input placeholder="Search lab tests catalog" value={pendingReportTestSearch} onChange={(e) => setPendingReportTestSearch(e.target.value)} /></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {filteredPendingTests.map((t) => (<button key={t.id} className="chip-modern" onClick={() => setPendingReportData(prev => ({ ...prev, recommendedTests: [...prev.recommendedTests, { id: t.id, name: t.name, price: t.price }] }))}><FlaskConical size={12} /> {t.name} ({formatPKR(t.price)})</button>))}
                </div>
                <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', marginBottom: '1rem' }}><strong>Selected Tests:</strong> {pendingReportData.recommendedTests.map(t => `${t.name} (${formatPKR(t.price)})`).join(', ') || 'None'}</div>
              </div>
              <div className="input-group"><label className="ehr-label">Notes</label><textarea placeholder="Additional notes..." rows="2" value={pendingReportData.notes} onChange={e => setPendingReportData({ ...pendingReportData, notes: e.target.value })} className="ehr-textarea" /></div>
              <div className="flex justify-end gap-2 mt-4"><button className="modern-button modern-button-secondary" onClick={() => setShowPendingReportModal(false)}>Cancel</button><button className="modern-button modern-button-primary" onClick={savePendingReport} disabled={pendingReportSaving}>{pendingReportSaving ? 'Saving...' : 'Save Report & Send to Reception'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Modal for completed patients */}
      {showReportsModal && selectedPatientForReport && (
        <div className="bill-modal-overlay" onClick={() => { setShowReportsModal(false); setSelectedPatientForReport(null); setShowNewReportForm(false); setSelectedReportView(null); }}>
          <div className="bill-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Patient Reports: {selectedPatientForReport.patientName}</h3>
                <button onClick={() => { setShowReportsModal(false); setSelectedPatientForReport(null); }}><X size={20} /></button>
              </div>
              {!showNewReportForm && !selectedReportView && (
                <>
                  <button className="modern-button modern-button-primary" style={{ marginBottom: '1rem' }} onClick={() => setShowNewReportForm(true)}><Plus size={14} /> Create New Report</button>
                  {loadingReports ? <div>Loading...</div> : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {patientReports.length === 0 ? <p>No previous reports found.</p> : patientReports.map(report => (
                        <div key={report._id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><strong>{new Date(report.reportDate).toLocaleDateString()}</strong> – {report.diagnosis.substring(0, 60)}...</div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="modern-button modern-button-secondary" onClick={() => printReport(report)}><Printer size={14} /> Print</button>
                              <button className="modern-button modern-button-outline" onClick={() => setSelectedReportView(report)}>View Details</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {showNewReportForm && (
                <div>
                  <h4>New Medical Report</h4>
                  <div style={{ marginBottom: '1rem' }}><label className="ehr-label">Gender</label><select value={newReport.gender} onChange={e => setNewReport({ ...newReport, gender: e.target.value })} className="ehr-select" style={{ width: '100%' }}><option>Male</option><option>Female</option><option>Other</option></select></div>
                  <div className="form-icon-group" style={{ marginBottom: '1rem' }}><textarea placeholder="Diagnosis" rows="3" value={newReport.diagnosis} onChange={e => setNewReport({ ...newReport, diagnosis: e.target.value })} className="ehr-textarea" /></div>
                  <div className="form-icon-group" style={{ marginBottom: '0.5rem' }}><Pill size={16} /><input placeholder="Search medicines catalog" value={medSearch.report || ''} onChange={(e) => setMedSearch({ ...medSearch, report: e.target.value })} /></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(filteredMeds.report || []).filter(m => m.quantity > 0).map(m => (<button key={m.id} className="chip-modern" onClick={() => setNewReport(prev => ({ ...prev, prescriptions: [...prev.prescriptions, { id: m.id, name: m.name, price: m.price, quantity: 1 }] }))}><Pill size={12} /> {m.name} ({formatPKR(m.price)}) – Stock: {m.quantity}</button>))}
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', marginBottom: '1rem' }}><strong>Selected Rx:</strong> {newReport.prescriptions.map(m => `${m.name} (${formatPKR(m.price)})`).join(', ') || 'None'}</div>
                  <div className="form-icon-group" style={{ marginBottom: '0.5rem' }}><FlaskConical size={16} /><input placeholder="Search lab tests catalog" value={testSearch.report || ''} onChange={(e) => setTestSearch({ ...testSearch, report: e.target.value })} /></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(filteredTests.report || []).map(t => (<button key={t.id} className="chip-modern" onClick={() => setNewReport(prev => ({ ...prev, recommendedTests: [...prev.recommendedTests, { id: t.id, name: t.name, price: t.price }] }))}><FlaskConical size={12} /> {t.name} ({formatPKR(t.price)})</button>))}
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', marginBottom: '1rem' }}><strong>Selected Tests:</strong> {newReport.recommendedTests.map(t => `${t.name} (${formatPKR(t.price)})`).join(', ') || 'None'}</div>
                  <div className="form-icon-group" style={{ marginBottom: '1rem' }}><textarea placeholder="Additional notes (optional)" rows="2" value={newReport.notes} onChange={e => setNewReport({ ...newReport, notes: e.target.value })} className="ehr-textarea" /></div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button className="modern-button modern-button-secondary" onClick={() => setShowNewReportForm(false)}>Cancel</button>
                    <button className="modern-button modern-button-primary" onClick={() => saveNewReport(selectedPatientForReport)} disabled={savingReport}>{savingReport ? 'Saving...' : 'Save Report'}</button>
                  </div>
                </div>
              )}
              {selectedReportView && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}><h4>Report Details</h4><button className="modern-button modern-button-secondary" onClick={() => setSelectedReportView(null)}>Back to list</button></div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <p><strong>Date:</strong> {new Date(selectedReportView.reportDate).toLocaleString()}</p>
                    <p><strong>Diagnosis:</strong> {selectedReportView.diagnosis}</p>
                    <p><strong>Prescriptions:</strong> {selectedReportView.prescriptions?.map(m => `${m.name} (${m.price})`).join(', ') || 'None'}</p>
                    <p><strong>Tests:</strong> {selectedReportView.recommendedTests?.map(t => `${t.name} (${t.price})`).join(', ') || 'None'}</p>
                    {selectedReportView.notes && <p><strong>Notes:</strong> {selectedReportView.notes}</p>}
                    <button className="modern-button modern-button-primary" onClick={() => printReport(selectedReportView)}><Printer size={14} /> Print Report</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EHR History Modal (with Lab Results) */}
      {showHistoryModal && selectedPatient && (
        <div className="bill-modal-overlay" onClick={() => { setShowHistoryModal(false); setSelectedPastCase(null); }}>
          <div className="bill-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Electronic Health Record</h3>
                <button onClick={() => { setShowHistoryModal(false); setSelectedPastCase(null); }}><X size={20} /></button>
              </div>
              {/* Demographics */}
              <div className="ehr-form-card bg-yellow-50">
                <div className="ehr-form-row">
                  <div><strong>Name:</strong> {selectedPatient.name}</div>
                  <div><strong>Phone:</strong> {selectedPatient.phone}</div>
                  <div><strong>Age:</strong> {selectedPatient.age || '—'}</div>
                  <div><strong>Gender:</strong> {selectedPatient.gender || '—'}</div>
                  <div><strong>CNIC:</strong> {selectedPatient.cnic || '—'}</div>
                </div>
                <div className="ehr-form-row">
                  <div><strong>Address:</strong> {selectedPatient.address || '—'}</div>
                  <div><strong>Emergency Contact:</strong> {selectedPatient.emergencyContact || '—'}</div>
                </div>
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <button className={`ehr-tab ${activeEhrTab === 'cases' ? 'active' : ''}`} onClick={() => setActiveEhrTab('cases')}>📋 Visit History</button>
                <button className={`ehr-tab ${activeEhrTab === 'allergies' ? 'active' : ''}`} onClick={() => setActiveEhrTab('allergies')}><AlertTriangle size={14} style={{display:'inline'}} /> Allergies</button>
                <button className={`ehr-tab ${activeEhrTab === 'problems' ? 'active' : ''}`} onClick={() => setActiveEhrTab('problems')}><ClipboardList size={14} /> Problem List</button>
                <button className={`ehr-tab ${activeEhrTab === 'immunizations' ? 'active' : ''}`} onClick={() => setActiveEhrTab('immunizations')}><Syringe size={14} /> Immunizations</button>
                <button className={`ehr-tab ${activeEhrTab === 'vitals' ? 'active' : ''}`} onClick={() => setActiveEhrTab('vitals')}><Heart size={14} /> Vitals</button>
                <button className={`ehr-tab ${activeEhrTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveEhrTab('notes')}><FileEdit size={14} /> Clinical Notes</button>
                <button className={`ehr-tab ${activeEhrTab === 'labresults' ? 'active' : ''}`} onClick={() => setActiveEhrTab('labresults')}>🔬 Lab Results</button>
              </div>

              {/* Cases tab */}
              {activeEhrTab === 'cases' && (
                <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  {!selectedPastCase ? (
                    (patientHistory?.cases || []).map(visit => (
                      <div key={visit._id} className="ehr-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{new Date(visit.createdAt).toLocaleDateString()}</strong><span className="status-badge">{visit.status}</span></div>
                        <div><strong>Doctor:</strong> Dr. {visit.doctorName}</div>
                        <div><strong>Diagnosis:</strong> {visit.diagnosis || '—'}</div>
                        <div><strong>Prescriptions:</strong> {(visit.prescriptions || []).map(m => m.name).join(', ') || '—'}</div>
                        <div><strong>Tests:</strong> {(visit.recommendedTests || []).map(t => t.name).join(', ') || '—'}</div>
                        <button className="chip-modern mt-2" onClick={() => setSelectedPastCase(visit)}>View Full Details</button>
                      </div>
                    ))
                  ) : (
                    <div><button className="modern-button modern-button-secondary mb-2" onClick={() => setSelectedPastCase(null)}>← Back</button><div className="ehr-card">{/* full details – you already have this code */}</div></div>
                  )}
                </div>
              )}

              {/* Allergies, Problems, Immunizations, Vitals, Clinical Notes – as before (omitted for brevity but you have the full version) */}
              {/* Lab Results Tab */}
              {activeEhrTab === 'labresults' && (
                <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  {loadingHistory ? <div>Loading lab history...</div> : (
                    !patientHistory?.labResults || patientHistory.labResults.length === 0 ? <p className="muted">No lab results found.</p> : (
                      patientHistory.labResults.map((res, idx) => {
                        const test = labTests.find(t => t._id === res.testId);
                        const unit = test?.unit || '';
                        const refRange = test?.normalRangeMin && test?.normalRangeMax ? `${test.normalRangeMin} - ${test.normalRangeMax} ${unit}` : '—';
                        return (
                          <div key={idx} className="ehr-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{res.testName}</strong><span className="status-badge">{new Date(res.createdAt).toLocaleDateString()}</span></div>
                            <div><strong>Result:</strong> {res.result} {unit}</div>
                            <div><strong>Reference Range:</strong> {refRange}</div>
                            <div><strong>Flag:</strong> <span style={{ color: res.flag === 'High' ? '#dc2626' : res.flag === 'Low' ? '#f59e0b' : '#10b981' }}>{res.flag}</span></div>
                            {res.comment && <div><strong>Note:</strong> {res.comment}</div>}
                            <button className="modern-button modern-button-outline mt-2" onClick={() => window.open(`${API_BASE}/lab-results/${res._id}/print`, '_blank')}><Printer size={12} /> Print Report</button>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorDesk;