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

function semLabelFromId(id) {
  const num = id.match(/^(\d+)/)
  if (!num) return id.replace(/-/g, ' ')
  const n = num[1]
  const suffix = n === '1' ? 'st' : n === '2' ? 'nd' : n === '3' ? 'rd' : 'th'
  return n + suffix + ' Semester'
}
