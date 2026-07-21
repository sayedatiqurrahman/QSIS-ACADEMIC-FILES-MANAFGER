/* ===========================================
   ROUTINE MANAGER — QSIS-ARMS
   Full CRUD for Class & Exam Routines
   localStorage + IndexedDB persistence
   A4-printable green/white IIUC theme
   =========================================== */

/* ── Data types (JSDoc) ──
 * @typedef {Object} RoutineMeta
 * @property {string} id         - unique id
 * @property {string} title      - user label
 * @property {string} semester   - semester id
 * @property {string} department
 * @property {string} session    - e.g. 2025-2026
 * @property {string} type       - "class"|"exam"
 * @property {string} status     - "draft"|"published"|"archived"
 * @property {string} room       - room number (class routines, shared by all entries)
 * @property {number} createdAt
 * @property {number} updatedAt
 *
 * @typedef {Object} ClassEntry
 * @property {string} day        - Saturday..Thursday
 * @property {string} time       - "8:00-8:55"
 * @property {string} code       - e.g. QSM3604
 * @property {string} subject
 * @property {string} teacher
 * @property {string} room
 * @property {string} color      - hex
 * @property {string} notes
 * @property {string} section
 * @property {string} building
 * @property {string} breakType  - ""|break|lunch|prayer
 *
 * @typedef {Object} ExamEntry
 * @property {string} date
 * @property {string} day
 * @property {string} slot       - "first"|"second"
 * @property {string} code
 * @property {string} subject
 * @property {string} time
 * @property {string} room
 * @property {string} invigilator
 * @property {boolean} empty     - true = X
 */

const RManager = {
  /* ── Storage ── */
  STORAGE_KEY: 'qsis_routines_v2',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [] }
    catch { return [] }
  },

  saveAll(routines) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(routines))
  },

  migrateOld() {
    try {
      const old = JSON.parse(localStorage.getItem('qsis_routine_data'))
      if (old) {
        Object.entries(old).forEach(([semId, semData]) => {
          const entries = semData.entries || []
          if (!entries.length) return
          const meta = {
            id: semId + '-class-migrated',
            title: semLabel(semId) + ' Class Routine',
            semester: semId,
            department: 'Qur\'anic Sciences & Islamic Studies',
            session: '',
            type: 'class',
            status: 'draft',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          const existing = this.find(meta.id)
          if (!existing) {
            const all = this.getAll()
            all.push({ meta, entries })
            this.saveAll(all)
          }
        })
        localStorage.removeItem('qsis_routine_data')
      }
      const oldExam = JSON.parse(localStorage.getItem('qsis_exam_data'))
      if (oldExam) {
        Object.entries(oldExam).forEach(([sem2, arr]) => {
          const entries = arr || []
          if (!entries.length) return
          const meta = {
            id: sem2 + '-exam-migrated',
            title: semLabel(semId) + ' Exam Routine',
            semester: sem2,
            department: 'Qur\'anic Sciences & Islamic Studies',
            session: '',
            type: 'exam',
            status: 'draft',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          const existing = this.find(meta.id)
          if (!existing) {
            const all = this.getAll()
            all.push({ meta, entries })
            this.saveAll(all)
          }
        })
        localStorage.removeItem('qsis_exam_data')
      }
    } catch {}
  },

  /* ── CRUD ── */
  find(id) { return this.getAll().find(r => r.meta.id === id) },

  create(meta, entries = []) {
    const all = this.getAll()
    meta.id = meta.id || Date.now().toString(36) + Math.random().toString(36).slice(2,6)
    meta.createdAt = meta.createdAt || Date.now()
    meta.updatedAt = Date.now()
    meta.status = meta.status || 'draft'
    const r = { meta, entries }
    all.push(r)
    this.saveAll(all)
    return r
  },

  update(id, patch) {
    const all = this.getAll()
    const idx = all.findIndex(r => r.meta.id === id)
    if (idx === -1) return
    Object.assign(all[idx].meta, patch, { updatedAt: Date.now() })
    if (patch._entries) { all[idx].entries = patch._entries; delete patch._entries }
    this.saveAll(all)
    return all[idx]
  },

  delete(id) {
    const all = this.getAll().filter(r => r.meta.id !== id)
    this.saveAll(all)
  },

  duplicate(id) {
    const orig = this.find(id)
    if (!orig) return
    return this.create({
      title: orig.meta.title + ' (Copy)',
      semester: orig.meta.semester,
      department: orig.meta.department,
      session: orig.meta.session,
      type: orig.meta.type
    }, JSON.parse(JSON.stringify(orig.entries)))
  },

  setStatus(id, status) { this.update(id, { status }) },

  /* ── Query helpers ── */
  query({ department, semester, type, status, search } = {}) {
    let result = this.getAll()
    if (department) result = result.filter(r => r.meta.department === department)
    if (semester) result = result.filter(r => r.meta.semester === semester)
    if (type) result = result.filter(r => r.meta.type === type)
    if (status) result = result.filter(r => r.meta.status === status)
    if (search) {
      const lw = search.toLowerCase()
      result = result.filter(r =>
        r.meta.title.toLowerCase().includes(lw) ||
        r.meta.semester.toLowerCase().includes(lw)
      )
    }
    return result.sort((a,b) => b.meta.updatedAt - a.meta.updatedAt)
  },

  fromSemester(semId, type) {
    return this.getAll().filter(r => r.meta.semester === semId && r.meta.type === type)
  },

  /* ── Conflict detection ── */
  conflicts(id, entries, type) {
    const current = this.find(id)
    const all = this.getAll().filter(r => r.meta.id !== id)
    const warnings = []
    if (type === 'class') {
      const seen = {}
      entries.forEach(e => {
        const key = e.day + '|' + e.time
        if (e.breakType) return
        const its = all.filter(r => r.meta.type === 'class' && r.meta.status === 'published')
        its.forEach(r => {
          r.entries.forEach(ee => {
            if (ee.day === e.day && ee.time === e.time && ee.room && e.room && ee.room === e.room) {
              warnings.push(`Room ${e.room} conflict: ${e.code} vs ${ee.code} on ${e.day} ${e.time}`)
            }
            if (ee.day === e.day && ee.time === e.time && ee.teacher && e.teacher && ee.teacher === e.teacher) {
              warnings.push(`Teacher ${e.teacher} conflict: ${e.code} vs ${ee.code} on ${e.day} ${e.time}`)
            }
          })
        })
        if (seen[key]) warnings.push(`Time overlap: ${e.code} at ${e.day} ${e.time}`)
        seen[key] = true
      })
    }
    return warnings
  },

  /* ── Generate ID from pattern ── */
  metaId(semId, type) {
    const base = semId + '-' + type + '-' + Date.now().toString(36)
    return base
  }
}

/* ── Helpers ── */
function semLabel(id) {
  const m = id && id.match(/^(\d+)/)
  if (!m) return id || ''
  const n = parseInt(m[1])
  const sfx = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return n + sfx + ' Semester'
}
function semNum(id) { const m = id && id.match(/^(\d+)/); return m ? parseInt(m[1]) : 0 }
const DAYS = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday']
const DEFAULT_SHIFTS = { first: '9:00 AM', second: '11:00 AM' }
const COLORS = ['#1b7d3b','#1565c0','#6a1b9a','#e65100','#00838f','#c62828','#283593','#4e342e']

function getShifts() {
  try {
    var s = localStorage.getItem('qsis_exam_shifts')
    if (s) { var p = JSON.parse(s); if (p && p.first && p.second) return p }
  } catch {}
  return DEFAULT_SHIFTS
}

function saveShifts(obj) {
  localStorage.setItem('qsis_exam_shifts', JSON.stringify(obj))
}

function resetShifts() {
  localStorage.removeItem('qsis_exam_shifts')
}
const DEFAULT_TIME_SLOTS = [
  '1st (10:40-11:30)','2nd (11:30-12:20)','3rd (12:20-1:10)',
  'Break (1:10-1:50)',
  '4th (1:50-2:40)','5th (2:40-3:30)','6th (3:30-4:20)'
]

function getTimeSlots() {
  try {
    var s = localStorage.getItem('qsis_time_slots')
    if (s) { var p = JSON.parse(s); if (Array.isArray(p) && p.length) return p }
  } catch {}
  return DEFAULT_TIME_SLOTS
}

function saveTimeSlots(arr) {
  localStorage.setItem('qsis_time_slots', JSON.stringify(arr))
}

function resetTimeSlots() {
  localStorage.removeItem('qsis_time_slots')
}

function openTimeSettings() {
  var cur = getTimeSlots().join('\n')
  var shifts = getShifts()
  var msg = 'Edit Class Routine time slots (one per line):\n(Leave empty to reset defaults)\n\n'
  msg += '--- Exam Shift timings ---\nSlot 1: ' + shifts.first + '\nSlot 2: ' + shifts.second
  var val = prompt(msg, cur)
  if (val === null) return
  var arr = val.split('\n').map(function(s) { return s.trim() }).filter(Boolean)
  if (!arr.length) { resetTimeSlots(); showToast('Class times reset to defaults', 'info') }
  else { saveTimeSlots(arr); showToast('Class times updated', 'success') }
  setTimeout(function() {
    var s1 = prompt('Exam Slot 1 time (e.g. 9:00 AM):', getShifts().first)
    if (s1 === null) return
    var s2 = prompt('Exam Slot 2 time (e.g. 11:00 AM):', getShifts().second)
    if (s2 === null) return
    if (!s1 && !s2) { resetShifts(); showToast('Exam shifts reset to defaults', 'info') }
    else { saveShifts({ first: s1 || DEFAULT_SHIFTS.first, second: s2 || DEFAULT_SHIFTS.second }); showToast('Exam shifts updated', 'success') }
    if (typeof renderRoutineTable === 'function') renderRoutineTable()
    if (typeof renderList === 'function') renderList()
    if (typeof RManager !== 'undefined' && RManager.refreshPreview) RManager.refreshPreview()
  }, 200)
}

const BREAK_TYPES = { break: 'Break', lunch: 'Lunch', prayer: 'Prayer' }

/* =========================================
   UI RENDER
   ========================================= */

function esc(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML }

/* ── Stats ── */
function renderDashboard() {
  const all = RManager.getAll()
  document.getElementById('statTotal').textContent = all.length
  document.getElementById('statPublished').textContent = all.filter(r => r.meta.status === 'published').length
  document.getElementById('statDraft').textContent = all.filter(r => r.meta.status === 'draft').length
  document.getElementById('statArchived').textContent = all.filter(r => r.meta.status === 'archived').length
}

/* ── Data table list ── */
function renderRoutineTable() {
  const q = {
    department: document.getElementById('fDepartment').value,
    semester: document.getElementById('fSemester').value,
    type: document.getElementById('fType').value,
    status: document.getElementById('fStatus').value,
    search: document.getElementById('fSearch').value
  }
  const list = RManager.query(q)
  const wrapper = document.getElementById('rTableWrapper')

  const cnt = document.getElementById('filterCount')
  if (cnt) cnt.textContent = list.length + ' routine' + (list.length !== 1 ? 's' : '')

  if (!list.length) {
    wrapper.innerHTML = '<div class="r-empty"><i class="fas fa-calendar-alt"></i><p>No routines match your filters.</p></div>'
    return
  }

  const statusIcon = { published: '✅', draft: '📝', archived: '🗂️' }
  const typeIcon = { class: '📚', exam: '📋' }

  let html = `<div class="r-table-wrapper"><table class="r-table"><thead><tr>
    <th>Title</th><th>Type</th><th>Semester</th><th>Session</th><th>Status</th><th>Updated</th><th></th>
  </tr></thead><tbody>`

  list.forEach(r => {
    const m = r.meta
    const statusLabel = { published: 'Published', draft: 'Draft', archived: 'Archived' }
    html += `<tr onclick="RManager.previewRoutine('${m.id}')">
      <td><strong>${esc(m.title)}</strong></td>
      <td>${typeIcon[m.type] || ''} ${m.type === 'class' ? 'Class' : 'Exam'}</td>
      <td>${semLabel(m.semester)}</td>
      <td>${esc(m.session || '—')}</td>
      <td><span class="status-badge ${m.status}">${statusIcon[m.status]||''} ${statusLabel[m.status]||m.status}</span></td>
      <td>${timeAgo(m.updatedAt)}</td>
      <td>
        <div class="action-btns" onclick="event.stopPropagation()">
          <button class="btn btn-sm" onclick="RManager.modalOpen('edit','${m.id}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm" onclick="RManager.duplicateConfirm('${m.id}')" title="Duplicate"><i class="fas fa-copy"></i></button>
          <button class="btn btn-sm" onclick="RManager.toggleStatus('${m.id}',event)" title="Toggle Status">${m.status === 'published' ? '🔴' : m.status === 'archived' ? '📝' : '✅'}</button>
          <button class="btn btn-sm" onclick="RManager.deleteConfirm('${m.id}')" style="border-color:var(--danger);color:var(--danger)" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`
  })

  html += `</tbody></table></div>`
  wrapper.innerHTML = html
}

function timeAgo(ts) {
  const d = Date.now() - ts
  if (d < 60000) return 'Just now'
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago'
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago'
  return Math.floor(d / 86400000) + 'd ago'
}

/* ── Preview render ── */
RManager.previewRoutine = function(id) {
  const r = this.find(id)
  if (!r) return

  const title = document.getElementById('previewTitle')
  const meta = document.getElementById('previewMeta')
  const body = document.getElementById('rPreviewBody')

  if (title) title.textContent = r.meta.title
  if (meta) meta.textContent = semLabel(r.meta.semester) + ' · ' + r.meta.type.charAt(0).toUpperCase() + r.meta.type.slice(1)

  if (r.meta.type === 'class') {
    body.innerHTML = renderClassTable(r)
  } else {
    body.innerHTML = renderExamTable(r)
  }

  // switch to preview tab
  document.querySelectorAll('#rViewTabs button').forEach(b => b.classList.remove('active'))
  document.querySelector('#rViewTabs button[data-view="preview"]').classList.add('active')
  document.querySelectorAll('.r-tab-content').forEach(c => c.style.display = 'none')
  document.getElementById('rPreviewView').style.display = ''
}

/* Class table */
function renderClassTable(r) {
  const m = r.meta
  const sLabel = semLabel(m.semester)
  const today = DAYS[new Date().getDay()]
  const days = DAYS

  let h = `<div class="r-print-header">
    <img src="assets/iiuc-logo.png" alt="IIUC" class="header-logo" />
    <div class="header-info">
      <h1>International Islamic University Chittagong</h1>
      <h2>Department of Qur'anic Sciences & Islamic Studies</h2>
      <div class="sub"><span>Class Routine</span><span>Semester: ${esc(sLabel)}</span>${m.room ? `<span>Room: ${esc(m.room)}</span>` : ''}<span>Session: ${esc(m.session || '—')}</span><span>Updated: ${new Date(m.updatedAt).toLocaleDateString()}</span></div>
    </div>
  </div>`

  h += `<table class="r-class-table"><thead><tr><th>Day</th>`
  getTimeSlots().forEach(t => { h += `<th>${t}</th>` })
  h += `</tr></thead><tbody>`

  const map = {}
  r.entries.forEach(e => {
    const key = e.day + '|' + e.time
    map[key] = e
  })

  days.forEach(day => {
    const isToday = day === today
    const dayEntries = r.entries.filter(e => e.day === day)
    const hasClasses = dayEntries.some(e => !e.breakType)

    if (!hasClasses) {
      h += `<tr ${isToday ? 'style="background:var(--r-today)"' : ''}><td>${esc(day)}</td><td colspan="${getTimeSlots().length}" style="text-align:center;color:#aaa;font-style:italic;padding:14px 0;font-size:.85rem">Off-Day</td></tr>`
      return
    }

    h += `<tr ${isToday ? 'style="background:var(--r-today)"' : ''}><td>${day}</td>`

    getTimeSlots().forEach(time => {
      const key = day + '|' + time
      const e = map[key]

      if (e && e.breakType) {
        const labels = { break: 'Break', lunch: 'Lunch / Prayer', prayer: 'Prayer' }
        h += `<td class="${e.breakType}-cell">${labels[e.breakType] || e.breakType}</td>`
      } else if (e) {
        const bgColor = e.color ? `background:${e.color}18;border-left:3px solid ${e.color}` : ''
        h += `<td><div class="cell-class" style="${bgColor}">
          <div class="code">${esc(e.code)}</div>
          <div class="subject">${esc(e.subject)}</div>
          <div class="teacher">${esc(e.teacher)}</div>
          ${m.room ? `<div class="room">Room ${esc(m.room)}</div>` : ''}
          ${e.section ? `<span class="badge" style="background:${e.color || '#1b7d3b'}">${esc(e.section)}</span>` : ''}
          <div class="actions">
            <button onclick="RManager.modalOpen('edit','${r.meta.id}')" style="background:#1b7d3b" title="Edit">✎</button>
            <button onclick="if(confirm('Remove ${esc(e.code)}?')){RManager.removeClassEntryAndRefresh('${r.meta.id}','${esc(e.day)}','${esc(e.time)}')}" style="background:#ef4444" title="Remove">×</button>
          </div>
        </div></td>`
      } else {
        h += `<td><div class="cell-empty" onclick="RManager.quickAdd('${r.meta.id}','${esc(day)}','${esc(time)}')">+</div></td>`
      }
    })
    h += `</tr>`
  })

  h += `</tbody></table>`
  h += `<div class="r-print-footer">
    <span>Generated: ${new Date().toLocaleString()} · Last Updated: ${new Date(m.updatedAt).toLocaleString()}</span>
    <span><img src="assets/arms-logo.png" alt="QSIS-ARMS" style="height:24px;vertical-align:middle;border-radius:3px" /> QSIS-ARMS</span>
    <span>Presented by <a href="https://programming-light.eu.cc" target="_blank">Programming Light</a></span>
  </div>`
  return h
}

/* Exam table */
function renderExamTable(r) {
  const m = r.meta
  const sLabel = semLabel(m.semester)
  const slots = ['first','second']

  let h = `<div class="r-print-header">
    <img src="assets/iiuc-logo.png" alt="IIUC" class="header-logo" />
    <div class="header-info">
      <h1>International Islamic University Chittagong</h1>
      <h2>Department of Qur'anic Sciences & Islamic Studies</h2>
      <div class="sub"><span>Examination Schedule</span><span>Semester: ${esc(sLabel)}</span><span>Session: ${esc(m.session || '—')}</span><span>Updated: ${new Date(m.updatedAt).toLocaleDateString()}</span></div>
    </div>
  </div>`

  h += `<table class="r-exam-table"><thead><tr><th>Date</th><th>Day</th>`
  h += `<th>Slot 1<br>${getShifts().first}</th><th>Slot 2<br>${getShifts().second}</th>`
  h += `</tr></thead><tbody>`

  const map = {}
  const dates = []
  r.entries.forEach(e => {
    const key = e.date + '|' + e.day
    if (!map[key]) { map[key] = {}; dates.push(key) }
    map[key][e.slot] = e
  })

  dates.sort().forEach(key => {
    const [date, day] = key.split('|')
    h += `<tr><td>${esc(date)}</td><td>${esc(day)}</td>`

    slots.forEach(slot => {
      const e = map[key] && map[key][slot]
      if (e && e.empty) {
        h += `<td><div class="exam-slot"><span class="x">X</span></div></td>`
      } else if (e) {
        const bgMatch = e.code ? COLORS[Math.abs(hashCode(e.code)) % COLORS.length] : '#1b7d3b'
        h += `<td><div class="exam-slot" style="background:${bgMatch}18;border-left:3px solid ${bgMatch}">
          <div class="code">${esc(e.code)}</div>
          <div class="subject">${esc(e.subject)}</div>
          ${e.time ? `<div class="time">${esc(e.time)}</div>` : `<div class="time">${getShifts()[slot] || ''}</div>`}
          ${e.room ? `<div class="room">Room ${esc(e.room)}</div>` : ''}
          ${e.invigilator ? `<div class="invigilator">Inv: ${esc(e.invigilator)}</div>` : ''}
        </div></td>`
      } else {
        h += `<td>—</td>`
      }
    })
    h += `</tr>`
  })

  h += `</tbody>`

  const footnotes = r.entries.filter(e => e.notes)
  if (footnotes.length) {
    h += `<tfoot><tr><td colspan="5"><strong>Notes:</strong> ${footnotes.map(e => esc(e.notes)).join('; ')}</td></tr></tfoot>`
  }
  h += `</table>`

  h += `<div class="r-print-footer">
    <span>Generated: ${new Date().toLocaleString()} · Last Updated: ${new Date(m.updatedAt).toLocaleString()}</span>
    <span><img src="assets/arms-logo.png" alt="QSIS-ARMS" style="height:24px;vertical-align:middle;border-radius:3px" /> QSIS-ARMS</span>
    <span>Presented by <a href="https://programming-light.eu.cc" target="_blank">Programming Light</a></span>
  </div>`
  return h
}

function hashCode(s) { let h=0; for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0} return Math.abs(h) }

RManager.removeClassEntryAndRefresh = function(id, day, time) {
  const r = this.find(id)
  if (!r) return
  r.entries = r.entries.filter(e => !(e.day === day && e.time === time))
  this.update(id, { _entries: r.entries })
  this.previewRoutine(id)
  renderRoutineTable()
  renderDashboard()
}

RManager.quickAdd = function(id, day, time) {
  const r = this.find(id)
  if (!r) return
  const code = prompt('Course code (e.g. QSM3604):')
  if (!code) return
  const subject = prompt('Subject name:')
  if (!subject) return
  const teacher = prompt('Teacher name:') || ''
  const room = prompt('Room:') || ''
  r.entries.push({ day, time, code, subject, teacher, room, color: COLORS[r.entries.length % COLORS.length] })
  this.update(id, { _entries: r.entries })
  this.previewRoutine(id)
  renderRoutineTable()
  renderDashboard()
}

/* =========================================
   MODAL: Create / Edit
   ========================================= */

RManager.modalOpen = function(mode, id) {
  const overlay = document.getElementById('rModal')
  const title = document.getElementById('rModalTitle')
  const body = document.getElementById('rModalBody')
  const r = id ? this.find(id) : null

  title.innerHTML = mode === 'edit'
    ? '<i class="fas fa-edit"></i> Edit Routine'
    : '<i class="fas fa-plus"></i> Create Routine'

  body.innerHTML = this.buildForm(mode, r)
  overlay.classList.add('active')
}

RManager.buildForm = function(mode, existing) {
  const m = existing ? existing.meta : {}
  const entries = existing ? existing.entries : []
  const isClass = mode === 'edit' ? m.type === 'class' : true

  let html = `<form id="rForm" class="r-form" onsubmit="RManager.saveForm(event)">
    <div class="form-row-inline">
      <div class="form-group">
        <label>Title</label>
        <input name="title" value="${esc(m.title || '')}" placeholder="e.g. 3rd Semester Class Routine" required />
      </div>
      <div class="form-group" style="min-width:140px">
        <label>Type</label>
        <select name="type" required ${mode === 'edit' ? 'disabled' : ''} onchange="document.getElementById('roomFieldRow').style.display=this.value==='exam'?'none':'flex'">
          <option value="class" ${m.type === 'exam' ? '' : 'selected'} ${!mode ? 'selected' : ''}>Class Routine</option>
          <option value="exam" ${m.type === 'exam' ? 'selected' : ''}>Exam Schedule</option>
        </select>
      </div>
    </div>
    <div class="form-row-inline">
      <div class="form-group">
        <label>Semester</label>
        <select name="semester" required ${mode === 'edit' ? 'disabled' : ''} id="fSemSelect">
          <option value="">Select...</option>
          ${CONFIG.semesters.map(s => `<option value="${s.id}" ${s.id === m.semester ? 'selected':''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Academic Session</label>
        <input name="session" value="${esc(m.session || '')}" placeholder="e.g. 2025-2026" />
      </div>
    </div>

    <hr style="border:none;border-top:1px solid var(--border);margin:4px 0" />
    <div class="form-row-inline" id="roomFieldRow" ${!isClass ? 'style="display:none"' : ''}>
      <div class="form-group" style="min-width:160px">
        <label>Room Number</label>
        <input name="room" value="${esc(m.room || '')}" placeholder="e.g. 401" />
      </div>
    </div>`

  if (mode === 'edit') {
    if (isClass) {
      html += this.buildClassEntryForm(existing)
    } else {
      html += this.buildExamEntryForm(existing)
    }
    html += `<input type="hidden" name="id" value="${m.id}" />`
  } else {
    html += `<p style="font-size:.82rem;color:var(--text2);padding:8px 0">Create the routine, then add entries.</p>`
  }

  html += `
    <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border);margin-top:auto">
      <button type="button" class="btn" onclick="RManager.modalClose()">Cancel</button>
      <button type="submit" class="btn btn-glow">${mode === 'edit' ? 'Save Changes' : 'Create Routine'}</button>
   </div>
  </form>`

  return html
}

RManager.buildClassEntryForm = function(r) {
  const entries = r.entries
  let h = `<div style="margin:8px 0"><label style="font-size:.82rem;font-weight:600">Class Entries</label></div>
  <div id="entriesSection" style="max-height:40vh;overflow-y:auto">`

  entries.forEach((e, i) => {
    const bgColor = e.color || COLORS[0]
    h += `<div class="entry-row" style="background:${bgColor}08;border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
      <input type="hidden" name="entryDay${i}" value="${e.day}" />
      <input type="hidden" name="entryTime${i}" value="${e.time}" />
      <div class="form-row-inline" style="gap:6px;margin-bottom:4px">
        <div style="flex:1;min-width:80px"><input name="entryCode${i}" value="${esc(e.code)}" placeholder="Code" /></div>
        <div style="flex:2;min-width:140px"><input name="entrySubject${i}" value="${esc(e.subject)}" placeholder="Subject" /></div>
        <div style="flex:1;min-width:100px"><input name="entryTeacher${i}" value="${esc(e.teacher)}" placeholder="Teacher" /></div>
        <div style="flex:0 0 80px">
          <select name="entryBtype${i}">
            <option value="">Class</option>
            ${Object.entries(BREAK_TYPES).map(([v,l]) => `<option value="${v}" ${e.breakType===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        ${i > 0 ? `<button type="button" style="border:none;color:var(--danger);background:none;cursor:pointer;font-size:1.1rem" onclick="RManager.deleteEntryRow(this,\`${r.meta.id}\`,${i})">&times;</button>` : ''}
      </div>
      <div style="font-size:.72rem;color:var(--text2)"><span>${e.day} · ${e.time}</span> <span class="color-dot" style="background:${bgColor}"></span></div>
      <input type="hidden" name="entryColor${i}" value="${bgColor}" />
    </div>`
  })
  h += `</div>
  <div style="display:flex;gap:6px;margin-top:8px">
    <button type="button" class="btn btn-sm" onclick="RManager.addEntryRow('${r.meta.id}')"><i class="fas fa-plus"></i> Add Row</button>
    <span style="font-size:.72rem;color:var(--text2);align-self:center">${entries.length} entries</span>
    ${RManager.conflicts(r.meta.id, entries, 'class').map(w => `<span style="font-size:.7rem;color:#ef4444;margin-left:6px">⚠ ${w}</span>`).join('')}
  </div>
  <hr style="border:none;border-top:1px solid var(--border);margin:12px 0" />`
  return h
}

RManager.buildExamEntryForm = function(r) {
  const entries = r.entries
  let h = `<div style="margin:8px 0"><label style="font-size:.82rem;font-weight:600">Exam Entries</label></div>
  <div id="entriesSection" style="max-height:40vh;overflow-y:auto">`

  entries.forEach((e, i) => {
    h += `<div class="entry-row" style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
      <input type="hidden" name="exDate${i}" value="${e.date}" />
      <input type="hidden" name="exDay${i}" value="${e.day}" />
      <input type="hidden" name="exSlot${i}" value="${e.slot}" />
      <div class="form-row-inline" style="gap:6px">
        <div style="flex:1"><input name="exCode${i}" value="${esc(e.code)}" placeholder="Code" /></div>
        <div style="flex:2"><input name="exSubject${i}" value="${esc(e.subject)}" placeholder="Subject" /></div>
        <div style="flex:0 0 80px"><input name="exTime${i}" value="${esc(e.time)}" placeholder="Time" /></div>
        <div style="flex:0 0 70px"><input name="exRoom${i}" value="${esc(e.room||'')}" placeholder="Room" /></div>
      </div>
      <div style="font-size:.72rem;color:var(--text2);margin-top:4px">${esc(e.date)} · ${esc(e.day)} · Slot ${e.slot}</div>
      ${i > 0 ? `<button type="button" style="position:absolute;top:6px;right:6px;border:none;color:var(--danger);background:none;cursor:pointer" onclick="RManager.deleteEntryRow(this,\`${r.meta.id}\`,${i})">&times;</button>` : ''}
    </div>`
  })

  h += `</div>
  <div style="margin-top:8px">
    <button type="button" class="btn btn-sm" onclick="RManager.addExamEntryRow('${r.meta.id}')"><i class="fas fa-plus"></i> Add Exam Slot</button>
    <span style="font-size:.72rem;color:var(--text2);margin-left:8px">${entries.length} entries</span>
  </div>
  <hr style="border:none;border-top:1px solid var(--border);margin:12px 0" />`
  return h
}

RManager.addEntryRow = function(id) {
  const section = document.getElementById('entriesSection')
  const last = section.querySelector('.entry-row:last-child')
  const daySelect = `<select name="entryDay${section.children.length}"><option value="">Day</option>${DAYS.map(d => `<option>${d}</option>`).join('')}</select>`
  const timeSelect = `<select name="entryTime${section.children.length}"><option value="">Time</option>${getTimeSlots().map(t => `<option>${t}</option>`).join('')}</select>`

  const div = document.createElement('div')
  div.className = 'entry-row'
  div.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px'
  div.innerHTML = `<div class="form-row-inline" style="gap:6px;margin-bottom:4px">
    ${daySelect}
    ${timeSelect}
    <div style="flex:1;min-width:80px"><input name="entryCode${section.children.length}" placeholder="Code" /></div>
    <div style="flex:2;min-width:120px"><input name="entrySubject${section.children.length}" placeholder="Subject" /></div>
    <div style="flex:1;min-width:80px"><input name="entryTeacher${section.children.length}" placeholder="Teacher" /></div>
    <button type="button" style="border:none;color:var(--danger);background:none;font-size:1.1rem;cursor:pointer" onclick="RManager.deleteEntryRow(this)">&times;</button>
  </div>`
  section.appendChild(div)
  div.querySelector('select:first-child')?.focus()
}

RManager.addExamEntryRow = function(id) {
  const section = document.getElementById('entriesSection')
  const i = section.children.length
  const div = document.createElement('div')
  div.className = 'entry-row'
  div.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px'
  div.innerHTML = `<div class="form-row-inline" style="gap:6px">
    <div><input name="exDate${i}" type="date" /></div>
    <div><select name="exDay${i}"><option value="">Day</option>${DAYS.map(d => `<option>${d}</option>`).join('')}</select></div>
    <div><select name="exSlot${i}" onchange="autoFillShiftTime(this)"><option value="">Slot</option><option value="first">Slot 1</option><option value="second">Slot 2</option></select></div>
    <div style="flex:1"><input name="exCode${i}" placeholder="Code" /></div>
    <div style="flex:2"><input name="exSubject${i}" placeholder="Subject" /></div>
    <div><input name="exTime${i}" placeholder="Time" /></div>
    <button type="button" style="border:none;color:var(--danger);background:none;font-size:1.1rem;cursor:pointer" onclick="RManager.deleteEntryRow(this)">&times;</button>
  </div>`
  section.appendChild(div)
}

function autoFillShiftTime(sel) {
  var row = sel.closest('.entry-row')
  if (!row) return
  var timeInput = row.querySelector('[name^="exTime"]')
  if (!timeInput) return
  var shifts = getShifts()
  var map = { first: shifts.first, second: shifts.second }
  if (sel.value && map[sel.value] && !timeInput.value) {
    timeInput.value = map[sel.value]
  }
}

RManager.deleteEntryRow = function(btn) {
  const row = btn.closest('.entry-row')
  if (row && confirm('Remove this entry?')) row.remove()
}

RManager.saveForm = function(e) {
  e.preventDefault()
  const form = document.getElementById('rForm')
  const fd = new FormData(form)

  const type = fd.get('type') || document.querySelector('[name="type"]')?.value
  const id = fd.get('id')

  if (id) {
    // Edit existing
    const r = this.find(id)
    if (!r) return
    const isClass = r.meta.type === 'class'

    r.meta.title = fd.get('title')
    r.meta.session = fd.get('session')
    r.meta.room = fd.get('room') || ''
    r.meta.updatedAt = Date.now()

    const newEntries = this.collectEntries(form, isClass, r.meta.type)
    if (newEntries) {
      r.entries = newEntries
      const warnings = this.conflicts(id, newEntries, r.meta.type)
      if (warnings.length && !confirm(warnings.join('\n\n') + '\n\nSave anyway?')) return
    }

    this.update(id, { title: r.meta.title, session: r.meta.session, _entries: r.entries })
    this.modalClose()

    this.previewRoutine(id)
    renderDashboard()
    renderRoutineTable()
  } else {
    // Create
    const title = fd.get('title')
    const sem = fd.get('semester')
    const session = fd.get('session')
    const rtype = type || fd.get('type') || 'class'
    if (!title || !sem) { alert('Title and semester required'); return }

    const meta = {
      id: RManager.metaId(sem, rtype),
      title,
      semester: sem,
      department: 'Qur\'anic Sciences & Islamic Studies',
      session,
      type: rtype,
      room: fd.get('room') || ''
    }
    this.create(meta, [])
    this.modalClose()
    renderDashboard()
    renderRoutineTable()
  }
}

RManager.collectEntries = function(form, isClass) {
  if (!isClass) {
    const entries = []
    const sections = document.querySelectorAll('#entriesSection .entry-row')
    sections.forEach((row, i) => {
      const date = row.querySelector('[name^="exDate"]')?.value
      const day = row.querySelector('[name^="exDay"]')?.value
      const slot = row.querySelector('[name^="exSlot"]')?.value
      const code = row.querySelector('[name^="exCode"]')?.value
      const subject = row.querySelector('[name^="exSubject"]')?.value
      const time = row.querySelector('[name^="exRoom"]')?.value
      const room = row.querySelector('[name^="exTime"]')?.value
      if (code && day && date) {
        entries.push({
          date, day, slot, code, subject, time: time || '', room: room || '', empty: code === 'X'
        })
      }
    })
    return entries
  }

  const entries = []
  const sections = document.querySelectorAll('#entriesSection .entry-row')
  const type = sections.length ? (sections[0]?.querySelector('[name^="entryCode"]') ? 'entry' : null) : null

  if (sections.length) {
    sections.forEach((row) => {
      const day = row.querySelector('[name^="entryDay"]')?.value
      const time = row.querySelector('[name^="entryTime"]')?.value
      const code = row.querySelector('[name^="entryCode"]')?.value || ''
      const subject = row.querySelector('[name^="entrySubject"]')?.value || ''
      const teacher = row.querySelector('[name^="entryTeacher"]')?.value || ''
      const btype = row.querySelector('[name^="entryBtype"]')?.value || ''
      const color = row.querySelector('[name^="entryColor"]')?.value || ''
      if (code || btype) entries.push({ day, time, code, subject, teacher, room: '', color, breakType: btype })
    })
  }
  return entries
}

/* ── Form state management ── */
RManager.toggleStatus = function(id, ev) {
  ev.stopPropagation()
  const r = this.find(id)
  if (!r) { renderRoutineTable(); renderDashboard(); return }
  const map = { published: 'archived', archived: 'draft', draft: 'published' }
  if (r.meta.status === 'published' && !confirm('Unpublish ' + r.meta.title + '?')) { return }
  this.setStatus(id, map[r.meta.status])
  if (document.getElementById('rPreviewBody')?.dataset?.id === id) this.previewRoutine(id)
  renderDashboard()
  renderRoutineTable()
}

RManager.deleteConfirm = function(id) {
  const r = this.find(id)
  document.getElementById('confirmIcon').className = 'fas fa-exclamation-triangle'
  document.getElementById('confirmTitle').textContent = 'Delete Routine'
  document.getElementById('confirmBody').textContent = 'Delete "' + (r?.meta?.title || 'this routine') + '"? This cannot be undone.'
  document.getElementById('confirmProceed').onclick = () => { this.delete(id); this.closeConfirm(); renderDashboard(); renderRoutineTable(); if (document.getElementById('rPreviewBody').dataset) delete document.getElementById('rPreviewBody').dataset.id; document.getElementById('rPreviewBody').innerHTML = '<div class=r-empty><i class=\"fas fa-eye\"></i><p>Routine deleted</p></div>' }
  document.getElementById('rConfirmOverlay').classList.add('active')
}

RManager.duplicateConfirm = function(id) {
  const r = this.find(id)
  document.getElementById('confirmIcon').className = 'fas fa-copy'
  document.getElementById('confirmTitle').textContent = 'Duplicate Routine'
  document.getElementById('confirmBody').textContent = 'Create a copy of "' + (r?.meta?.title || 'this routine') + '"?'
  document.getElementById('confirmProceed').onclick = () => { this.duplicate(id); this.closeConfirm(); renderDashboard(); renderRoutineTable() }
  document.getElementById('rConfirmOverlay').classList.add('active')
}

RManager.closeConfirm = function() {
  document.getElementById('rConfirmOverlay').classList.remove('active')
}

RManager.modalClose = function() {
  document.getElementById('rModal').classList.remove('active')
}

RManager.closeCopy = function() {
  document.getElementById('rCopyDrawer').classList.remove('active')
}

/* ── Copy from previous semester ── */
RManager.promptCopy = function() {
  const all = this.getAll().filter(r => r.meta.status === 'published' || r.meta.status === 'draft')
  const body = document.getElementById('rCopyBody')
  body.innerHTML = `<p style="margin-bottom:12px;font-size:.85rem">Select a published/draft routine to copy into a new semester.</p>
    <select id="copyRoutineSelect" class="r-select-routine">${all.map(r => `<option value="${r.meta.id}">${esc(r.meta.title)} · ${semLabel(r.meta.semester)} · ${r.meta.type}</option>`).join('')}</select>
    <div style="margin-top:12px"><select id="copyTargetSelect" class="r-select-routine">${CONFIG.semesters.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}</select></div>
    <button class="btn btn-glow" style="margin-top:16px;width:100%" onclick="RManager.execCopy()">Copy Routine</button>`
  if (!all.length) body.innerHTML = `<p style="color:var(--text2)">No published or draft routines to copy.</p>`
  document.getElementById('rCopyDrawer').classList.add('active')
}

RManager.execCopy = function() {
  const origId = document.getElementById('copyRoutineSelect')?.value
  const semId = document.getElementById('copyTargetSelect')?.value
  const orig = this.find(origId)
  if (!orig || !semId) return
  const copy = this.duplicate(origId)
  if (copy) {
    this.update(copy.meta.id, {
      title: semLabel(semId) + ' ' + (orig.meta.type === 'exam' ? 'Exam Routine' : 'Class Routine'),
      semester: semId,
      status: 'draft'
    })
  }
  this.closeCopy()
  renderDashboard()
  renderRoutineTable()
}

/* ── Import CSV-like (simple) ── */
RManager.promptImport = function() {
  const code = prompt('Paste routine data (JSON format) or type a semester name to auto-create:')
  if (!code) return
  try {
    const data = JSON.parse(code)
    if (data.meta && data.entries) {
      this.create(data.meta, data.entries)
      alert('Imported!')
      renderDashboard()
      renderRoutineTable()
    }
  } catch {
    // just create empty routine
    const sem = code.trim()
    const match = CONFIG.semesters.find(s => s.id === sem || s.label.toLowerCase() === sem.toLowerCase())
    if (match) {
      this.create({
        title: match.label + ' Class Routine',
        semester: match.id,
        department: 'Qur\'anic Sciences & Islamic Studies',
        session: prompt('Academic session?') || '',
        type: 'class'
      }, [])
    }
    renderDashboard()
    renderRoutineTable()
  }
}

/* ── Print / PDF / Image export ── */
RManager.printPreview = function() {
  window.print()
}

RManager.exportPdf = function() {
  const body = document.getElementById('rPreviewBody')
  if (!body.querySelector('.r-class-table') && !body.querySelector('.r-exam-table')) {
    alert('Nothing to export. Preview a routine first.')
    return
  }
  captureRoutine(body, 'QSIS-Routine.pdf')
}

RManager.exportImage = function() {
  const body = document.getElementById('rPreviewBody')
  if (!body.querySelector('.r-class-table') && !body.querySelector('.r-exam-table')) {
    alert('Nothing to export. Preview a routine first.')
    return
  }
  captureRoutine(body, 'QSIS-Routine.png', true)
}

function captureRoutine(el, filename, isImage) {
  const header = el.querySelector('.r-print-header')
  if (header) header.style.display = 'flex'

  html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false })
    .then(canvas => {
      if (header) header.style.display = 'none'
      if (isImage) {
        const a = document.createElement('a')
        a.download = filename
        a.href = canvas.toDataURL('image/png')
        a.click()
      } else {
        const imgData = canvas.toDataURL('image/png')
        const { jsPDF } = window.jspdf
        const isExam = !!el.querySelector('.r-exam-table')
        const orientation = isExam ? 'portrait' : 'landscape'
        const w = isExam ? 210 : 297
        const h = w * canvas.height / canvas.width
        const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
        pdf.addImage(imgData, 'PNG', 0, 0, w, h)
        pdf.save(filename)
      }
    })
    .catch(err => { alert('Export failed: ' + err.message) })
}

/* ── Initialisation ── */
RManager.init = function() {
  this.migrateOld()
  renderDashboard()

  // semester filter
  const semSel = document.getElementById('fSemester')
  CONFIG.semesters.forEach(s => {
    const o = document.createElement('option')
    o.value = s.id; o.textContent = s.label; semSel.appendChild(o)
  })

  // filter events
  document.querySelectorAll('#rFilters select, #rFilters input').forEach(el => {
    el.addEventListener('input', renderRoutineTable)
    el.addEventListener('change', renderRoutineTable)
  })

  renderRoutineTable()

  // Tab switching List / Preview / Print
  document.querySelectorAll('#rViewTabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#rViewTabs button').forEach(b => b.classList.remove('active'))
      this.classList.add('active')
      document.querySelectorAll('.r-tab-content').forEach(c => c.style.display = 'none')
      const view = this.dataset.view
      const el = document.getElementById('r' + view.charAt(0).toUpperCase() + view.slice(1) + 'View')
      if (el) el.style.display = ''

      if (view === 'print') {
        const preview = document.getElementById('rPreviewBody')
        const target = document.getElementById('rPrintView')
        if (preview.innerHTML.includes('class-table') || preview.innerHTML.includes('exam-table')) {
          const cloned = preview.cloneNode(true)
          cloned.id = 'printClone'
          const h = cloned.querySelector('.r-print-header')
          if (h) h.style.display = 'flex'
          target.innerHTML = '<div class="r-print-wrapper">' + cloned.innerHTML + '</div>'
        } else {
          target.innerHTML = '<div class=r-empty><i class="fas fa-print"></i><p>Preview a routine first</p></div>'
        }
      }
    })
  })

  // hide other tabs initially
  document.querySelectorAll('.r-tab-content:not(#rListView)').forEach(c => c.style.display = 'none')

  // keyboard shortcut
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); this.modalOpen('create') }
    if (e.ctrlKey && e.shiftKey && e.key === 'P') { e.preventDefault(); this.printPreview() }
    if (e.key === 'Escape') {
      this.modalClose()
      this.closeCopy()
      this.closeConfirm()
    }
    if (e.ctrlZ) { e.preventDefault(); alert('Undo not yet implemented') }
  })
}

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', () => {
  // wait for CONFIG
  const check = setInterval(() => {
    if (typeof CONFIG !== 'undefined') {
      clearInterval(check)
      RManager.init()
    }
  }, 50)
  setTimeout(() => clearInterval(check), 8000)
})
