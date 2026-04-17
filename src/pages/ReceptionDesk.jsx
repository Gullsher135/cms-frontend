import { useMemo, useState, useEffect } from 'react'
import { API_BASE } from '../constants'
import CaseTable from '../components/CaseTable'

function ReceptionDesk({ cases, setCases, doctors, onUpdate, generateBill, getBills }) {
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    patientName: '',
    age: '',
    phone: '',
    cnic: '',
    doctorName: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
  })
  const [extraLabFee, setExtraLabFee] = useState({})
  const [extraPharmFee, setExtraPharmFee] = useState({})
  const [checkingSlot, setCheckingSlot] = useState(false)
  const [existingAppointments, setExistingAppointments] = useState([])
  const [generatedBill, setGeneratedBill] = useState(null)
  const [consultationBill, setConsultationBill] = useState(null)
  const [existingBills, setExistingBills] = useState([])
  const [viewingBills, setViewingBills] = useState(null)

  const printThermalReceipt = (element) => {
    if (!element) return
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
      </html>`
    const printWindow = window.open('', '_blank', 'width=360,height=760')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const billingQueue = useMemo(() => cases.filter((c) => c.status === 'reception'), [cases])

  const loadExistingAppointments = async () => {
    if (!form.doctorName || !form.appointmentDate) {
      setExistingAppointments([])
      return
    }
    const selectedDoctor = doctors.find((d) => d.name === form.doctorName)
    if (!selectedDoctor) {
      setExistingAppointments([])
      return
    }

    try {
      const response = await fetch(`${API_BASE}/appointments?doctorId=${selectedDoctor.id}&day=${form.appointmentDate}`)
      if (response.ok) {
        const appointments = await response.json()
        setExistingAppointments(appointments.filter(apt => apt.status !== 'cancelled'))
      }
    } catch (err) {
      setExistingAppointments([])
    }
  }

  // Load appointments when doctor or date changes
  useEffect(() => {
    loadExistingAppointments()
  }, [form.doctorName, form.appointmentDate, doctors])

  const checkSlotAvailability = async () => {
    if (!form.doctorName || !form.appointmentDate || !form.appointmentTime) return true
    const selectedDoctor = doctors.find((d) => d.name === form.doctorName)
    if (!selectedDoctor) return true

    setCheckingSlot(true)
    try {
      const response = await fetch(`${API_BASE}/appointments?doctorId=${selectedDoctor.id}&day=${form.appointmentDate}`)
      if (!response.ok) return true
      const appointments = await response.json()
      const isBooked = appointments.some(apt => apt.time === form.appointmentTime && apt.status !== 'cancelled')
      setCheckingSlot(false)
      return !isBooked
    } catch (err) {
      setCheckingSlot(false)
      return true // Assume available if check fails
    }
  }

  const addCase = async () => {
    if (!form.patientName || !form.phone || !form.doctorName) return

    const isAvailable = await checkSlotAvailability()
    if (!isAvailable) {
      setError('This appointment slot is already booked. Please choose a different time.')
      return
    }

    const selectedDoctor = doctors.find((d) => d.name === form.doctorName)
    fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('cms_token') || ''}`,
      },
      body: JSON.stringify({ ...form, doctorId: selectedDoctor?.id || '' }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.message || 'Failed to create appointment')
        return body
      })
      .then(async (created) => {
        setError('')
        setCases((prev) => [{ ...created, id: created._id }, ...prev])
        
        // Generate consultation fee bill immediately
        try {
          const selectedDoctor = doctors.find((d) => d.name === form.doctorName)
          const consultFee = selectedDoctor?.consultFee || 0
          
          const appointmentDate = new Date(form.appointmentDate + 'T' + form.appointmentTime)
          const billData = {
            caseId: created._id,
            patientName: created.patientName,
            doctorName: created.doctorName,
            doctorId: created.doctorId,
            billType: 'appointment',
            title: 'Appointment Consultation Fee',
            services: [
              { name: 'Consultation Fee', amount: consultFee }
            ],
            totalAmount: consultFee,
            appointmentDetails: {
              date: appointmentDate.toLocaleDateString(),
              time: appointmentDate.toLocaleTimeString(),
              day: appointmentDate.toLocaleDateString('en-US', { weekday: 'long' })
            },
            generatedBy: 'Reception Desk',
            generatedAt: new Date().toISOString()
          }
          
          const bill = await generateBill(billData)
          setConsultationBill(bill)
        } catch (billErr) {
          console.log('Bill generation note:', billErr.message)
        }
        
        // Reset form on success
        setForm({
          patientName: '',
          age: '',
          phone: '',
          cnic: '',
          doctorName: '',
          appointmentDate: '',
          appointmentTime: '',
          reason: '',
        })
      })
      .catch((err) => setError(err.message))
  }

  return (
    <section className="form-panel">
      <h2>Reception / Counter Desk</h2>
      <p>One user handles appointment booking, billing, and token issuance in a single shared workflow.</p>
      <div className="form-grid">
        <input placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
        <input placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="CNIC" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
        <select value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })}>
          <option value="">Select doctor</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.name}>{d.name} - {d.specialization}</option>
          ))}
        </select>
        <input type="date" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} />
        <input type="time" value={form.appointmentTime} onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })} />
        {checkingSlot && <small className="muted">Checking slot availability...</small>}
        <input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </div>
      <button type="button" onClick={addCase} disabled={checkingSlot}>
        {checkingSlot ? 'Checking availability...' : 'Create Appointment & Send to Doctor'}
      </button>
      {error ? <p className="error-text">{error}</p> : null}

      {existingAppointments.length > 0 && (
        <div className="existing-appointments">
          <h4>Existing appointments for {form.appointmentDate}:</h4>
          <ul>
            {existingAppointments.map((apt) => (
              <li key={apt._id}>
                {apt.time} - {apt.patientName} ({apt.reason})
              </li>
            ))}
          </ul>
        </div>
      )}

      {existingAppointments.length > 0 && (
        <div className="existing-appointments">
          <h4>Existing appointments for {form.appointmentDate}:</h4>
          <ul>
            {existingAppointments.map((apt) => (
              <li key={apt._id}>
                {apt.time} - {apt.patientName} ({apt.reason})
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>Billing Queue</h3>
      <CaseTable
        cases={billingQueue}
        actions={(c) => {
          const doctorFee = c.billingPaid ? 0 : Number(doctors.find((d) => d.id === c.doctorId)?.consultFee || 0)
          const testsTotal = (c.recommendedTests || []).reduce((acc, t) => acc + Number(t.price || 0), 0)
          const medsTotal = (c.prescriptions || []).reduce((acc, m) => acc + Number(m.price || 0), 0)
          const total = doctorFee + testsTotal + medsTotal + Number(extraLabFee[c.id] || 0) + Number(extraPharmFee[c.id] || 0)
          return (
            <>
              <p className="muted inline-text">Doctor fee: PKR {doctorFee}</p>
              <p className="muted inline-text">Tests total: PKR {testsTotal}</p>
              <p className="muted inline-text">Medicines total: PKR {medsTotal}</p>
              <input placeholder="Extra lab charges" value={extraLabFee[c.id] || ''} onChange={(e) => setExtraLabFee({ ...extraLabFee, [c.id]: e.target.value })} />
              <input placeholder="Extra pharmacy charges" value={extraPharmFee[c.id] || ''} onChange={(e) => setExtraPharmFee({ ...extraPharmFee, [c.id]: e.target.value })} />
              <button
                type="button"
                onClick={async () => {
                  const token = `TKN-${Date.now().toString().slice(-6)}`
                  try {
                    // Update the case first
                    await onUpdate(c.id, {
                      billingPaid: true,
                      token,
                      invoiceAmount: String(total),
                      status: c.recommendedTests?.length ? 'lab' : c.prescriptions?.length ? 'pharmacy' : 'closed',
                      labStatus: c.recommendedTests?.length ? 'pending' : 'not_required',
                      pharmacyStatus: c.prescriptions?.length ? 'pending' : 'not_required',
                      timelineAction: 'Reception collected payment',
                      timelineNote: `Invoice total PKR ${total}`,
                    })
                    
                    // Generate the bill
                    const labTestsForBill = (c.recommendedTests || []).map(t => ({
                      name: t.name,
                      price: Number(t.price || 0)
                    }))
                    const billData = {
                      caseId: c.id,
                      doctorFee: c.billingPaid ? 0 : doctorFee,
                      medicines: c.prescriptions || [],
                      labTests: labTestsForBill,
                      extraLabCharges: Number(extraLabFee[c.id] || 0),
                      extraPharmacyCharges: Number(extraPharmFee[c.id] || 0),
                      token,
                    }
                    
                    const bill = await generateBill(billData)
                    setGeneratedBill(bill)
                  } catch (err) {
                    setError('Failed to process payment')
                  }
                }}
              >
                Collect Payment & Issue Token
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={async () => {
                  try {
                    const token = c.token || `TKN-${Date.now().toString().slice(-6)}`
                    const labTestsForBill = (c.recommendedTests || []).map(t => ({
                      name: t.name,
                      price: Number(t.price || 0)
                    }))
                    const billData = {
                      caseId: c.id,
                      doctorFee: c.billingPaid ? 0 : doctorFee,
                      medicines: c.prescriptions || [],
                      labTests: labTestsForBill,
                      extraLabCharges: Number(extraLabFee[c.id] || 0),
                      extraPharmacyCharges: Number(extraPharmFee[c.id] || 0),
                      token,
                    }
                    
                    const bill = await generateBill(billData)
                    setGeneratedBill(bill)
                  } catch (err) {
                    setError('Failed to generate bill')
                  }
                }}
              >
                🧾 Generate Bill
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={async () => {
                  try {
                    const bills = await getBills(c.id)
                    setExistingBills(bills)
                    setViewingBills(c.id)
                  } catch (err) {
                    setError('Failed to load bills')
                  }
                }}
              >
                📄 View Bills
              </button>
            </>
          )
        }}
      />

      {consultationBill && (
        <div className="bill-container printable-bill receipt-card">
          <div className="bill-header">
            <h3>💳 Appointment Consultation Fee Bill</h3>
            <small>Clinic Receipt</small>
            <button type="button" onClick={() => setConsultationBill(null)} className="close-btn">×</button>
          </div>
          
          <div className="bill-details">
            <div className="bill-section">
              <h4>Patient Information</h4>
              <p><strong>Name:</strong> {consultationBill.patientName}</p>
            </div>
            
            <div className="bill-section">
              <h4>Doctor Information</h4>
              <p><strong>Doctor:</strong> {consultationBill.doctorName}</p>
            </div>

            <div className="bill-section">
              <h4>Appointment Details</h4>
              {consultationBill.appointmentDetails && (
                <>
                  <p><strong>Date:</strong> {consultationBill.appointmentDetails.date}</p>
                  <p><strong>Time:</strong> {consultationBill.appointmentDetails.time}</p>
                  <p><strong>Day:</strong> {consultationBill.appointmentDetails.day}</p>
                </>
              )}
            </div>
            
            <div className="bill-section">
              <h4>Charges</h4>
              <div className="bill-breakdown">
                {consultationBill.services?.map((service, idx) => (
                  <div key={idx} className="bill-item">
                    <span>{service.name}</span>
                    <span>PKR {service.amount}</span>
                  </div>
                ))}
                <div className="bill-total">
                  <span><strong>Total Amount</strong></span>
                  <span><strong>PKR {consultationBill.totalAmount}</strong></span>
                </div>
              </div>
            </div>
            
            <div className="bill-footer">
              <p className="bill-thankyou">Please keep this receipt for your records</p>
            </div>
          </div>
          
          <div className="bill-actions">
            <button type="button" onClick={() => printThermalReceipt(document.querySelector('.printable-bill'))} className="print-btn">🖨️ Print Receipt</button>
            <button type="button" onClick={() => setConsultationBill(null)} className="close-bill-btn">Close</button>
          </div>
        </div>
      )}

      {generatedBill && (
        <div className="bill-container printable-bill receipt-card">
          <div className="bill-header">
            <h3>🧾 Payment Receipt</h3>
            <small>Clinic Receipt</small>
            <button type="button" onClick={() => setGeneratedBill(null)} className="close-btn">×</button>
          </div>
          
          <div className="bill-details">
            <div className="bill-section">
              <h4>Patient Information</h4>
              <p><strong>Name:</strong> {generatedBill.patientName}</p>
              <p><strong>Age:</strong> {generatedBill.patientAge}</p>
              <p><strong>Phone:</strong> {generatedBill.patientPhone}</p>
              <p><strong>CNIC:</strong> {generatedBill.patientCNIC}</p>
            </div>
            
            <div className="bill-section">
              <h4>Service Details</h4>
              <p><strong>Doctor:</strong> {generatedBill.doctorName}</p>
              <p><strong>Token:</strong> {generatedBill.token}</p>
              <p><strong>Date:</strong> {new Date(generatedBill.collectedAt).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(generatedBill.collectedAt).toLocaleTimeString()}</p>
            </div>
            
            <div className="bill-section">
              <h4>Charges Breakdown</h4>
              <div className="bill-breakdown">
                <div className="bill-item">
                  <span>Doctor Consultation Fee</span>
                  <span>PKR {generatedBill.doctorFee}</span>
                </div>
                
                {generatedBill.labTests?.length > 0 && (
                  <div className="bill-item">
                    <span>Lab Tests ({generatedBill.labTests.length})</span>
                    <span>PKR {generatedBill.labTests.reduce((sum, t) => sum + t.price, 0)}</span>
                  </div>
                )}
                
                {generatedBill.medicines?.length > 0 && (
                  <div className="bill-item">
                    <span>Medicines ({generatedBill.medicines.length})</span>
                    <span>PKR {generatedBill.medicines.reduce((sum, m) => sum + (m.price * (m.quantity || 1)), 0)}</span>
                  </div>
                )}
                
                {generatedBill.extraLabCharges > 0 && (
                  <div className="bill-item">
                    <span>Extra Lab Charges</span>
                    <span>PKR {generatedBill.extraLabCharges}</span>
                  </div>
                )}
                
                {generatedBill.extraPharmacyCharges > 0 && (
                  <div className="bill-item">
                    <span>Extra Pharmacy Charges</span>
                    <span>PKR {generatedBill.extraPharmacyCharges}</span>
                  </div>
                )}
                
                <div className="bill-total">
                  <span><strong>Total Amount</strong></span>
                  <span><strong>PKR {generatedBill.total}</strong></span>
                </div>
              </div>
            </div>
            
            <div className="bill-section">
              <h4>Itemized List</h4>
              
              {generatedBill.labTests?.length > 0 && (
                <div className="bill-items">
                  <h5>Lab Tests:</h5>
                  {generatedBill.labTests.map((test, idx) => (
                    <div key={idx} className="bill-item-detail">
                      <span>{test.name}</span>
                      <span>PKR {test.price}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {generatedBill.medicines?.length > 0 && (
                <div className="bill-items">
                  <h5>Medicines:</h5>
                  {generatedBill.medicines.map((med, idx) => (
                    <div key={idx} className="bill-item-detail">
                      <span>{med.name} (Qty: {med.quantity || 1})</span>
                      <span>PKR {med.price * (med.quantity || 1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bill-footer">
              <p><strong>Collected by:</strong> {generatedBill.collectedBy}</p>
              <p className="bill-thankyou">Thank you for choosing our clinic!</p>
            </div>
          </div>
          
          <div className="bill-actions">
            <button type="button" onClick={() => printThermalReceipt(document.querySelector('.printable-bill'))} className="print-btn">🖨️ Print Bill</button>
            <button type="button" onClick={() => setGeneratedBill(null)} className="close-bill-btn">Close</button>
          </div>
        </div>
      )}

      {viewingBills && (
        <div className="bills-list-container">
          <div className="bills-header">
            <h3>📄 Previous Bills</h3>
            <button type="button" onClick={() => setViewingBills(null)} className="close-btn">×</button>
          </div>
          
          {existingBills.length === 0 ? (
            <p className="no-bills">No bills found for this case.</p>
          ) : (
            <div className="bills-grid">
              {existingBills.map((bill) => (
                <div key={bill._id} className="bill-card">
                  <div className="bill-card-header">
                    <h4>Bill #{bill._id.slice(-8)}</h4>
                    <span className="bill-date">{new Date(bill.collectedAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="bill-card-details">
                    <p><strong>Token:</strong> {bill.token}</p>
                    <p><strong>Total:</strong> PKR {bill.total}</p>
                    <p><strong>Collected by:</strong> {bill.collectedBy}</p>
                    
                    <div className="bill-card-actions">
                      <button 
                        type="button" 
                        className="view-bill-btn"
                        onClick={() => {
                          setGeneratedBill(bill)
                          setViewingBills(null)
                        }}
                      >
                        👁️ View Bill
                      </button>
                      <button 
                        type="button" 
                        className="print-bill-btn"
                        onClick={() => {
                          setGeneratedBill(bill)
                          setViewingBills(null)
                          setTimeout(() => printThermalReceipt(document.querySelector('.printable-bill')), 300)
                        }}
                      >
                        🖨️ Print
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default ReceptionDesk
