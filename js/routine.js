const ROUTINE = {
  days: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  storageKey: 'qsis_routine_data',

  getData() {
    try { return JSON.parse(localStorage.getItem(this.storageKey)) || {} }
    catch { return {} }
  },
  saveData(data) { localStorage.setItem(this.storageKey, JSON.stringify(data)) },

  getRoutines(semId) {
    return this.getData()[semId] || { entries: [] }
  },
  saveRoutines(semId, routines) {
    const data = this.getData()
    data[semId] = routines
    this.saveData(data)
  },
  addClass(semId, entry) {
    const routines = this.getRoutines(semId)
    entry.id = Date.now()
    routines.entries.push(entry)
    this.saveRoutines(semId, routines)
  },
  removeClass(semId, id) {
    const routines = this.getRoutines(semId)
    routines.entries = routines.entries.filter(c => c.id !== id)
    this.saveRoutines(semId, routines)
  },

  // ---- Exam Schedule ----
  storageKeyExam: 'qsis_exam_data',
  getExamData() {
    try { return JSON.parse(localStorage.getItem(this.storageKeyExam)) || {} }
    catch { return {} }
  },
  saveExamData(data) { localStorage.setItem(this.storageKeyExam, JSON.stringify(data)) },
  getExams(semId) { return this.getExamData()[semId] || [] },
  addExam(semId, exam) {
    const data = this.getExamData()
    if (!data[semId]) data[semId] = []
    exam.id = Date.now()
    data[semId].push(exam)
    this.saveExamData(data)
  },
  removeExam(semId, id) {
    const data = this.getExamData()
    if (data[semId]) data[semId] = data[semId].filter(e => e.id !== id)
    this.saveExamData(data)
  }
}

function esc(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function semLabelFromId(id) {
  const num = id.match(/^(\d+)/)
  if (!num) return id.replace(/-/g, ' ')
  const n = num[1]
  const suffix = n === '1' ? 'st' : n === '2' ? 'nd' : n === '3' ? 'rd' : 'th'
  return n + suffix + ' Semester'
}

function renderRoutine(semId) {
  const container = document.getElementById('routineGrid')
  if (!container) return
  const printLabel = document.getElementById('printSemLabel')
  if (printLabel) printLabel.textContent = semId ? semLabelFromId(semId) : '-'
  const sel = document.getElementById('routineSemester')
  if (sel) document.getElementById('currentSemesterLabel').textContent = sel.options[sel.selectedIndex]?.text || ''

  const routines = ROUTINE.getRoutines(semId)

  // Group entries by day then time
  if (!routines.entries.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><p>No classes added yet. Use the form above to add one.</p></div>'
    return
  }

  let html = `<div class="timetable-wrapper"><table class="timetable"><thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Code</th><th>Teacher</th><th></th></tr></thead><tbody>`

  routines.entries.sort((a, b) => ROUTINE.days.indexOf(a.day) - ROUTINE.days.indexOf(b.day) || a.time.localeCompare(b.time))

  routines.entries.forEach(c => {
    html += `<tr>
      <td>${c.day}</td>
      <td>${esc(c.time)}</td>
      <td>${esc(c.subject)}</td>
      <td>${esc(c.code)}</td>
      <td>${esc(c.teacher)}</td>
      <td><button class="class-del" onclick="removeClass(\'${semId}\',${c.id})" title="Remove">×</button></td>
    </tr>`
  })

  html += `</tbody></table></div>`
  container.innerHTML = html
}

function removeClass(semId, id) {
  if (!confirm('Remove this entry?')) return
  ROUTINE.removeClass(semId, id)
  renderRoutine(semId)
  renderExamSchedule(document.getElementById('routineSemester').value)
}

function renderExamSchedule(semId) {
  const container = document.getElementById('examSchedule')
  if (!container) return
  const printLabel = document.getElementById('printExamSemLabel')
  if (printLabel) printLabel.textContent = semId ? semLabelFromId(semId) : '-'

  const exams = ROUTINE.getExams(semId)

  if (!exams.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No exams added yet. Use the form above to add one.</p></div>'
    return
  }

  // Group by shift
  const shifts = { 1: [], 2: [] }
  exams.forEach(e => { shifts[e.shift] ? shifts[e.shift].push(e) : (shifts[e.shift]=[e]) })

  let html = ''
  if (shifts[1].length) {
    html += `<h4 style="margin:0 0 8px;font-size:.85rem;color:var(--accent)"><i class="fas fa-sun"></i> Shift 1 (9:30 AM)</h4><div class="exam-list">`
    shifts[1].sort((a,b) => a.day.localeCompare(b.day)).forEach(e => {
      html += renderExamCard(semId, e)
    })
    html += `</div>`
  }
  if (shifts[2].length) {
    html += `<h4 style="margin:16px 0 8px;font-size:.85rem;color:var(--primary)"><i class="fas fa-moon"></i> Shift 2 (2:00 PM)</h4><div class="exam-list">`
    shifts[2].sort((a,b) => a.day.localeCompare(b.day)).forEach(e => {
      html += renderExamCard(semId, e)
    })
    html += `</div>`
  }

  container.innerHTML = html || '<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No exams added yet.</p></div>'
}

function renderExamCard(semId, e) {
  return `<div class="exam-card">
    <div class="exam-header">
      <strong>${e.day}</strong>
      <button class="exam-del" onclick="removeExam(\'${semId}\',${e.id})" title="Remove">×</button>
    </div>
    <div class="exam-dates">⏰ ${e.time}</div>
    <div class="exam-subjects">${esc(e.subject)} · ${esc(e.code)}</div>
  </div>`
}

function removeExam(semId, id) {
  if (!confirm('Remove this exam entry?')) return
  ROUTINE.removeExam(semId, id)
  renderExamSchedule(semId)
}

function loadRoutine() {
  const semSelect = document.getElementById('routineSemester')
  if (!semSelect) return
  const semId = semSelect.value
  const label = semSelect.options[semSelect.selectedIndex]?.text || ''
  document.getElementById('currentSemesterLabel').textContent = label
  renderRoutine(semId)
  renderExamSchedule(semId)
}

async function initRoutinePage() {
  const semSelect = document.getElementById('routineSemester')
  if (!semSelect) return

  try {
    const tree = await GITHUB.getUploadTree(true)
    const semIds = [...new Set(tree.tree.map(i => i.path.split('/')[0]).filter(Boolean))].sort()
    semIds.forEach(id => {
      const opt = document.createElement('option')
      opt.value = id
      opt.textContent = semLabelFromId(id)
      semSelect.appendChild(opt)
    })
    if (semIds.length) semSelect.value = semIds[0]
  } catch {
    CONFIG.semesters.forEach(s => {
      const opt = document.createElement('option')
      opt.value = s.id
      opt.textContent = s.label
      semSelect.appendChild(opt)
    })
  }

  semSelect.addEventListener('change', loadRoutine)
  loadRoutine()

  // Class routine form
  const form = document.getElementById('addClassForm')
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault()
      const semId = semSelect.value
      const data = new FormData(form)
      ROUTINE.addClass(semId, {
        day: data.get('day'),
        time: data.get('time'),
        subject: data.get('subject'),
        code: data.get('code'),
        teacher: data.get('teacher')
      })
      form.reset()
      loadRoutine()
    })
  }

  // Exam form
  const examForm = document.getElementById('addExamForm')
  if (examForm) {
    examForm.addEventListener('submit', e => {
      e.preventDefault()
      const semId = semSelect.value
      const data = new FormData(examForm)
      const shift = data.get('shift')
      const time = shift === '2' ? '2:00 PM' : '9:30 AM'
      ROUTINE.addExam(semId, {
        shift: parseInt(shift),
        day: data.get('examDay'),
        time: time,
        subject: data.get('examSubject'),
        code: data.get('examCode')
      })
      examForm.reset()
      loadRoutine()
    })
  }

  // Tab switching
  document.querySelectorAll('.routine-tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.routine-tab-btn').forEach(b => b.classList.remove('active'))
      this.classList.add('active')
      document.querySelectorAll('.routine-tab').forEach(t => t.style.display = 'none')
      const tab = document.getElementById(this.dataset.tab)
      if (tab) tab.style.display = ''
    })
  })
}

initRoutinePage()
