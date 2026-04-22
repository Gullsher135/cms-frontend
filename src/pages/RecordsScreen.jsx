import { useState } from 'react'
import CaseTable from '../components/CaseTable'
import { API_BASE } from '../constants'

function RecordsScreen({ cases, generateBill, getBills, doctors }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const limit = 10
  const [selectedCase, setSelectedCase] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [generatedBill, setGeneratedBill] = useState(null)
  const [existingBills, setExistingBills] = useState([])
  const [viewingBills, setViewingBills] = useState(null)
  const [previewBill, setPreviewBill] = useState(null)
  const [loadingBill, setLoadingBill] = useState(false)  // prevent double-click

  const getBillServices = (bill) => {
    if (Array.isArray(bill.services) && bill.services.length) {
      return bill.services
    }

    const services = []
    if (Array.isArray(bill.labTests) && bill.labTests.length) {
      bill.labTests.forEach((test) => {
        services.push({ name: test.name, amount: test.price || 0 })
      })
    }
    if (Array.isArray(bill.medicines) && bill.medicines.length) {
      bill.medicines.forEach((med) => {
        services.push({
          name: `${med.name}${med.quantity ? ` (Qty: ${med.quantity})` : ''}`,
          amount: (med.price || 0) * (med.quantity || 1),
        })
      })
    }
    if (bill.doctorFee != null && bill.billType !== 'services') {
      services.unshift({ name: 'Consultation Fee', amount: bill.doctorFee || 0 })
    }
    return services
  }

  const getBillTotalAmount = (bill) => {
    if (typeof bill.totalAmount === 'number') return bill.totalAmount
    if (typeof bill.total === 'number') return bill.total
    return getBillServices(bill).reduce((sum, item) => sum + (item.amount || 0), 0)
  }

  const getBillDateDetails = (bill) => {
    if (bill.appointmentDetails) return bill.appointmentDetails
    if (bill.serviceDetails) return bill.serviceDetails
    const sourceDate = bill.generatedAt || bill.collectedAt || bill.createdAt || new Date().toISOString()
    const date = new Date(sourceDate)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      day: date.toLocaleDateString('en-US', { weekday: 'long' }),
    }
  }

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

  const loadTimeline = (caseId) => {
    fetch(`${API_BASE}/cases/${caseId}/timeline`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('cms_token') || ''}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSelectedCase(caseId)
        setTimeline(Array.isArray(data) ? data : [])
      })
  }

  const handleGenerateBill = async (caseId, billType) => {
    if (loadingBill) return  // prevent double-click
    setLoadingBill(true)

    try {
      const caseData = cases.find(c => c._id === caseId)
      if (!caseData) {
        alert('Case not found')
        return
      }

      // Find doctor – handles both _id and id fields
      const doctor = doctors.find(d => 
        d._id === caseData.doctorId || d.id === caseData.doctorId
      )
      const doctorName = doctor ? doctor.name : (caseData.doctorName || 'Unknown Doctor')
      const consultFee = doctor ? (doctor.consultFee || 0) : 0

      let billData = {
        caseId,
        patientName: caseData.patientName,
        doctorName: doctorName,
        doctorId: caseData.doctorId,
        billType,
        generatedBy: 'Records Desk',
        generatedAt: new Date().toISOString()
      }

      if (billType === 'services') {
        // Services bill: individual lab tests and medicines
        const services = []
        if (caseData.recommendedTests?.length > 0) {
          caseData.recommendedTests.forEach((test) => {
            services.push({ name: test.name, amount: test.price || 0 })
          })
        }
        if (caseData.prescriptions?.length > 0) {
          caseData.prescriptions.forEach((med) => {
            services.push({
              name: `${med.name}${med.quantity ? ` (Qty: ${med.quantity})` : ''}`,
              amount: (med.price || 0) * (med.quantity || 1),
            })
          })
        }
        billData.services = services
        billData.totalAmount = services.reduce((sum, s) => sum + (s.amount || 0), 0)
        billData.title = 'Services Bill'

        const serviceDate = caseData.createdAt ? new Date(caseData.createdAt) : new Date()
        billData.serviceDetails = {
          date: serviceDate.toLocaleDateString(),
          time: serviceDate.toLocaleTimeString(),
          day: serviceDate.toLocaleDateString('en-US', { weekday: 'long' }),
        }
      } else if (billType === 'appointment') {
        // Appointment bill: consultation fee
        billData.services = [{ name: 'Consultation Fee', amount: consultFee }]
        billData.totalAmount = consultFee
        billData.title = 'Appointment Bill'

        // Add appointment details from case data
        if (caseData.appointmentDate) {
          const appointmentDate = new Date(caseData.appointmentDate)
          let formattedTime = caseData.appointmentTime || ''
          if (caseData.appointmentTime) {
            const timeParts = caseData.appointmentTime.split(':')
            if (timeParts.length >= 2) {
              const date = new Date()
              date.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]))
              formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          }
          billData.appointmentDetails = {
            date: appointmentDate.toLocaleDateString(),
            time: formattedTime,
            day: appointmentDate.toLocaleDateString('en-US', { weekday: 'long' })
          }
        }
      }

      const bill = await generateBill(billData)
      setPreviewBill(bill)
      alert(`${billType === 'services' ? 'Services' : 'Appointment'} bill generated successfully!`)
    } catch (error) {
      alert('Error generating bill: ' + error.message)
    } finally {
      setLoadingBill(false)
    }
  }

  const handleViewBills = (caseId) => {
    getBills(caseId)
      .then((bills) => {
        setExistingBills(bills)
        setViewingBills(caseId)
      })
      .catch((error) => {
        alert('Error loading bills: ' + error.message)
      })
  }

  const filtered = cases
    .filter((c) => {
      const t = `${c.patientName} ${c.phone} ${c.cnic} ${c.doctorName}`.toLowerCase()
      return t.includes(search.toLowerCase())
    })
    .sort((a, b) => {
      const left = a[sortBy] || ''
      const right = b[sortBy] || ''
      return sortOrder === 'asc'
        ? String(left).localeCompare(String(right))
        : String(right).localeCompare(String(left))
    })
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit))
  const paged = filtered.slice((page - 1) * limit, page * limit)

  return (
    <section className="form-panel">
      <h2>Patient Records</h2>
      <p>All current and previous cases are preserved and visible here.</p>
      <div className="form-grid">
        <input placeholder="Search patient/doctor/phone/cnic" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt">Created At</option>
          <option value="patientName">Patient Name</option>
          <option value="doctorName">Doctor Name</option>
          <option value="status">Status</option>
        </select>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
      <CaseTable 
        cases={paged} 
        onViewTimeline={loadTimeline}
        actions={(caseItem) => (
          <div className="table-actions">
            <select 
              className="action-dropdown"
              onChange={(e) => {
                if (e.target.value) {
                  handleGenerateBill(caseItem.id, e.target.value)
                  e.target.value = '' // Reset dropdown
                }
              }}
              defaultValue=""
              disabled={loadingBill}
            >
              <option value="" disabled>Generate Bill</option>
              <option value="services">Services Bill (Lab & Pharmacy)</option>
              <option value="appointment">Appointment Bill (Consultation)</option>
            </select>
            {/* <button type="button" className="secondary-btn" onClick={() => handleViewBills(caseItem.id)}>
              View Bills
            </button> */}
          </div>
        )}
      />
      <div className="pager">
        <button type="button" className="secondary-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button type="button" className="secondary-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
      {selectedCase && (
        <div className="timeline-box">
          <h3>Timeline for {selectedCase}</h3>
          <ul className="timeline-list">
            {timeline.map((item, idx) => (
              <li key={`${item.at}-${idx}`}>
                <strong>{item.action}</strong>
                <small>{item.at} by {item.by} ({item.actorRole})</small>
                <small>{item.note}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {generatedBill && (
        <div className="bill-container">
          <h3>Generated {generatedBill.title || 'Bill'}</h3>
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
                  <div key={idx} className="service-item">
                    <span>{service.name}</span>
                    <span>PKR {service.amount}</span>
                  </div>
                ))}
              </div>
              <div className="bill-total">
                <strong>Total: PKR {getBillTotalAmount(generatedBill)}</strong>
              </div>
            </div>
            <div className="bill-actions">
              <button type="button" className="primary-btn" onClick={() => setPreviewBill(generatedBill)}>Preview & Print</button>
              <button type="button" className="secondary-btn" onClick={() => setGeneratedBill(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {viewingBills && (
        <div className="bills-list-container">
          <div className="bills-header">
            <h3>Bills for Case {viewingBills}</h3>
          </div>
          {existingBills.length === 0 ? (
            <div className="bills-content">
              <p className="muted">No bills found for this case.</p>
            </div>
          ) : (
            <div className="bills-content">
              <div className="bills-grid">
                {existingBills.map((bill) => (
                  <div key={bill._id} className="bill-card">
                    <div className="bill-header">
                      <h4>{bill.title || 'Bill'} #{bill.id}</h4>
                      <small>Generated on {new Date(bill.generatedAt).toLocaleString()}</small>
                    </div>
                    <div className="bill-details">
                      <p><strong>Patient:</strong> {bill.patientName}</p>
                      <p><strong>Doctor:</strong> {bill.doctorName}</p>
                      {bill.appointmentDetails && (
                        <div className="appointment-info">
                          <h5>Appointment Details:</h5>
                          <p><strong>Date:</strong> {bill.appointmentDetails.date}</p>
                          <p><strong>Time:</strong> {bill.appointmentDetails.time}</p>
                          <p><strong>Day:</strong> {bill.appointmentDetails.day}</p>
                        </div>
                      )}
                      {bill.serviceDetails && (
                        <div className="appointment-info">
                          <h5>Service Details:</h5>
                          <p><strong>Date:</strong> {bill.serviceDetails.date}</p>
                          <p><strong>Time:</strong> {bill.serviceDetails.time}</p>
                          <p><strong>Day:</strong> {bill.serviceDetails.day}</p>
                        </div>
                      )}
                      <div className="bill-services">
                        <h5>Services:</h5>
                        {getBillServices(bill).map((service, idx) => (
                          <div key={idx} className="service-item">
                            <span>{service.name}</span>
                            <span>PKR {service.amount}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bill-total">
                        <strong>Total: PKR {getBillTotalAmount(bill)}</strong>
                      </div>
                    </div>
                    <div className="bill-actions">
                      <button type="button" className="primary-btn" onClick={() => setPreviewBill(bill)}>Preview & Print</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bills-footer">
            <button type="button" className="secondary-btn" onClick={() => setViewingBills(null)}>Close</button>
          </div>
        </div>
      )}

      {previewBill && (
        <div className="bill-preview-modal">
          <div className="bill-preview-overlay" onClick={() => setPreviewBill(null)}></div>
          <div className="bill-preview-content">
            <div className="bill-preview-header">
              <h2>Bill Preview</h2>
              <button type="button" className="close-btn" onClick={() => setPreviewBill(null)}>×</button>
            </div>
            <div className="bill-preview-body">
              <div className="bill-container printable-bill receipt-card">
                <div className="bill-header">
                  <h3>🧾 {previewBill.title || 'Bill'} #{previewBill.id}</h3>
                  <small>Clinic Receipt</small>
                </div>
                
                <div className="bill-details">
                  <div className="bill-section">
                    <h4>Patient Information</h4>
                    <p><strong>Name:</strong> {previewBill.patientName}</p>
                    <p><strong>Phone:</strong> {previewBill.patientPhone}</p>
                    <p><strong>CNIC:</strong> {previewBill.patientCNIC}</p>
                  </div>
                  
                  <div className="bill-section">
                    <h4>Doctor Information</h4>
                    <p><strong>Name:</strong> {previewBill.doctorName}</p>
                  </div>

                  {previewBill.appointmentDetails && (
                    <div className="bill-section">
                      <h4>Appointment Details</h4>
                      <p><strong>Date:</strong> {previewBill.appointmentDetails.date}</p>
                      <p><strong>Time:</strong> {previewBill.appointmentDetails.time}</p>
                      <p><strong>Day:</strong> {previewBill.appointmentDetails.day}</p>
                    </div>
                  )}

                  {previewBill.serviceDetails && (
                    <div className="bill-section">
                      <h4>Service Details</h4>
                      <p><strong>Date:</strong> {previewBill.serviceDetails.date}</p>
                      <p><strong>Time:</strong> {previewBill.serviceDetails.time}</p>
                      <p><strong>Day:</strong> {previewBill.serviceDetails.day}</p>
                    </div>
                  )}
                  
                  <div className="bill-section">
                    <h4>Services</h4>
                    <div className="bill-breakdown">
                      {getBillServices(previewBill).map((service, idx) => (
                        <div key={idx} className="bill-item">
                          <span>{service.name}</span>
                          <span>PKR {service.amount}</span>
                        </div>
                      ))}
                      <div className="bill-total">
                        <span><strong>Total Amount</strong></span>
                        <span><strong>PKR {getBillTotalAmount(previewBill)}</strong></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bill-footer">
                    <p><strong>Generated By:</strong> {previewBill.generatedBy}</p>
                    <p><strong>Case ID:</strong> {previewBill.caseId}</p>
                    <p className="bill-thankyou">Thank you for choosing our services!</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bill-preview-actions">
              <button type="button" className="secondary-btn" onClick={() => setPreviewBill(null)}>Close</button>
              <button type="button" className="primary-btn" onClick={() => printThermalReceipt(document.querySelector('.printable-bill'))}>🖨️ Print Bill</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default RecordsScreen