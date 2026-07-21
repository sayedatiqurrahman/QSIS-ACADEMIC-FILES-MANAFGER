const ROUTINE = {
  days: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  defaultSlots: [
    '8:00-8:55', '9:00-9:55', '10:00-10:55', '11:00-11:55',
    '12:00-12:55', '1:00-1:55', '2:00-2:55', '3:00-3:55', '4:00-4:55'
  ],
  storageKey: 'qsis_routine_data',

  getData() {
    try { return JSON.parse(localStorage.getItem(this.storageKey)) || {} }
    catch { return {} }
  },

  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  },

  getRoutines(semId) {
    return this.getData()[semId] || { slots: [...this.defaultSlots], classes: [] }
  },

  saveRoutines(semId, routines) {
    const data = this.getData()
    data[semId] = routines
    this.saveData(data)
  },

  addClass(semId, entry) {
    const routines = this.getRoutines(semId)
    entry.id = Date.now()
    routines.classes.push(entry)
    this.saveRoutines(semId, routines)
  },

  removeClass(semId, id) {
    const routines = this.getRoutines(semId)
    routines.classes = routines.classes.filter(c => c.id !== id)
    this.saveRoutines(semId, routines)
  },

  updateSlot(semId, oldSlot, newSlot) {
    const routines = this.getRoutines(semId)
    const idx = routines.slots.indexOf(oldSlot)
    if (idx > -1) routines.slots[idx] = newSlot
    routines.classes.forEach(c => { if (c.slot === oldSlot) c.slot = newSlot })
    this.saveRoutines(semId, routines)
  },

  addSlot(semId, slot) {
    const routines = this.getRoutines(semId)
    if (!routines.slots.includes(slot)) routines.slots.push(slot)
    this.saveRoutines(semId, routines)
  },

  removeSlot(semId, slot) {
    const routines = this.getRoutines(semId)
    routines.slots = routines.slots.filter(s => s !== slot)
    routines.classes = routines.classes.filter(c => c.slot !== slot)
    this.saveRoutines(semId, routines)
  },

  // ---- Exam Schedule ----
  storageKeyExam: 'qsis_exam_data',

  getExamData() {
    try { return JSON.parse(localStorage.getItem(this.storageKeyExam)) || {} }
    catch { return {} }
  },

  saveExamData(data) {
    localStorage.setItem(this.storageKeyExam, JSON.stringify(data))
  },

  getExams(semId) {
    return this.getExamData()[semId] || []
  },

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
  const days = ROUTINE.days
  const slots = routines.slots

  if (!slots.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><p>Add time slots and classes above.</p></div>'
    return
  }

  let html = `<div class="timetable-wrapper"><table class="timetable"><thead><tr><th class="time-col">Time</th>`
  days.forEach(d => { html += `<th>${d}</th>` })
  html += `</tr></thead><tbody>`

  slots.forEach(slot => {
    html += `<tr><td class="time-col">${esc(slot)}</td>`
    days.forEach(day => {
      const cls = routines.classes.filter(c => c.day === day && c.slot === slot)
      if (cls.length) {
        html += `<td class="has-class">`
        cls.forEach(c => {
          html += `<div class="class-entry" title="Teacher: ${esc(c.teacher)}, Room: ${esc(c.room)}">
            <span class="class-subject">${esc(c.subject)}</span>
            <span class="class-meta">${esc(c.teacher)} · ${esc(c.room)}</span>
            <span class="class-type ${c.type === 'Lab' ? 'lab' : 'lecture'}">${esc(c.type)}</span>
            <button class="class-del" onclick="removeClass(\'${semId}\',${c.id})" title="Remove">×</button>
          </div>`
        })
        html += `</td>`
      } else {
        html += `<td class="empty-slot"></td>`
      }
    })
    html += `</tr>`
  })

  html += `</tbody></table></div>`
  container.innerHTML = html
}

function removeClass(semId, id) {
  if (!confirm('Remove this class entry?')) return
  ROUTINE.removeClass(semId, id)
  renderRoutine(semId)
}

function renderExamSchedule(semId) {
  const container = document.getElementById('examSchedule')
  if (!container) return
  const printLabel = document.getElementById('printExamSemLabel')
  if (printLabel) printLabel.textContent = semId ? semLabelFromId(semId) : '-'
  const exams = ROUTINE.getExams(semId)

  if (!exams.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No exams scheduled yet. Add one above.</p></div>`
    return
  }

  let html = `<div class="exam-list">`
  exams.sort((a, b) => new Date(a.startDate) - new Date(b.startDate)).forEach(e => {
    html += `<div class="exam-card">
      <div class="exam-header">
        <strong>${esc(e.name)}</strong>
        <button class="exam-del" onclick="removeExam(\'${semId}\',${e.id})" title="Remove">×</button>
      </div>
      <div class="exam-dates">${esc(e.startDate)} → ${esc(e.endDate)}</div>
      <div class="exam-subjects">${esc(e.subjects)}</div>
    </div>`
  })
  html += `</div>`
  container.innerHTML = html
}

function removeExam(semId, id) {
  if (!confirm('Remove this exam schedule?')) return
  ROUTINE.removeExam(semId, id)
  renderExamSchedule(semId)
}

function loadRoutine() {
  const semSelect = document.getElementById('routineSemester')
  if (!semSelect) return
  const semId = semSelect.value
  document.getElementById('currentSemesterLabel').textContent = semSelect.options[semSelect.selectedIndex].text
  renderRoutine(semId)
  renderExamSchedule(semId)
}

async function initRoutinePage() {
  const semSelect = document.getElementById('routineSemester')
  if (!semSelect) return

  // Load semesters from GitHub
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
    // fallback: use config semesters
    CONFIG.semesters.forEach(s => {
      const opt = document.createElement('option')
      opt.value = s.id
      opt.textContent = s.label
      semSelect.appendChild(opt)
    })
  }

  semSelect.addEventListener('change', loadRoutine)
  loadRoutine()

  // Add class form
  const form = document.getElementById('addClassForm')
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault()
      const semId = semSelect.value
      const data = new FormData(form)
      ROUTINE.addClass(semId, {
        day: data.get('day'),
        slot: data.get('slot'),
        subject: data.get('subject'),
        teacher: data.get('teacher'),
        room: data.get('room'),
        type: data.get('type')
      })
      form.reset()
      loadRoutine()
    })
  }

  // Add exam form
  const examForm = document.getElementById('addExamForm')
  if (examForm) {
    examForm.addEventListener('submit', e => {
      e.preventDefault()
      const semId = semSelect.value
      const data = new FormData(examForm)
      ROUTINE.addExam(semId, {
        name: data.get('examName'),
        startDate: data.get('examStart'),
        endDate: data.get('examEnd'),
        subjects: data.get('examSubjects')
      })
      examForm.reset()
      loadRoutine()
    })
  }

  // Time slot management
  const addSlotBtn = document.getElementById('addSlotBtn')
  if (addSlotBtn) {
    addSlotBtn.addEventListener('click', () => {
      const semId = semSelect.value
      const input = document.getElementById('newSlotInput')
      if (input.value.trim()) {
        ROUTINE.addSlot(semId, input.value.trim())
        input.value = ''
        loadRoutine()
      }
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
