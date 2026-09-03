const JarvisState = {
  data: createEmptyMemory(),
  listeners: {},
  autosaveTimer: null,
  AUTOSAVE_DELAY: 1500,

  on(event, cb) {
    (this.listeners[event] = this.listeners[event] || []).push(cb);
  },

  emit(event, payload) {
    (this.listeners[event] || []).forEach(cb => cb(payload));
  },

  hydrate(memoryObj) {
    this.data = Object.assign(createEmptyMemory(), memoryObj || {});
    this.emit('hydrated', this.data);
    this.emit('notes:changed', this.data.notes);
    this.emit('tasks:changed', this.data.tasks);
  },

  scheduleAutosave() {
    this.emit('dirty');
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.emit('autosave:trigger');
    }, this.AUTOSAVE_DELAY);
  },

  addNote(title, body) {
    const note = {
      id: 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: title && title.trim() ? title.trim() : (body.slice(0, 40) || 'Nota senza titolo'),
      body: body || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.notes.unshift(note);
    this.emit('notes:changed', this.data.notes);
    this.scheduleAutosave();
    return note;
  },

  updateNote(id, { title, body }) {
    const note = this.data.notes.find(n => n.id === id);
    if (!note) return null;
    if (title !== undefined) note.title = title;
    if (body !== undefined) note.body = body;
    note.updatedAt = new Date().toISOString();
    this.emit('notes:changed', this.data.notes);
    this.scheduleAutosave();
    return note;
  },

  deleteNote(id) {
    this.data.notes = this.data.notes.filter(n => n.id !== id);
    this.emit('notes:changed', this.data.notes);
    this.scheduleAutosave();
  },

  searchNotes(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return this.data.notes;
    return this.data.notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    );
  },

  findNoteByFuzzyText(text) {
    const q = (text || '').toLowerCase().trim();
    if (!q) return null;
    return this.data.notes.find(n =>
      n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    ) || null;
  },

  addTask(text, priority) {
    const task = {
      id: 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: text.trim(),
      priority: priority || 'medium',
      done: false,
      createdAt: new Date().toISOString()
    };
    this.data.tasks.unshift(task);
    this.emit('tasks:changed', this.data.tasks);
    this.scheduleAutosave();
    return task;
  },

  completeTaskById(id) {
    const task = this.data.tasks.find(t => t.id === id);
    if (!task) return null;
    task.done = !task.done;
    this.emit('tasks:changed', this.data.tasks);
    this.scheduleAutosave();
    return task;
  },

  completeTaskByFuzzyText(text) {
    const q = (text || '').toLowerCase().trim();
    const task = this.data.tasks.find(t => !t.done && t.text.toLowerCase().includes(q));
    if (task) return this.completeTaskById(task.id);
    return null;
  },

  deleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.emit('tasks:changed', this.data.tasks);
    this.scheduleAutosave();
  },

  deleteTaskByFuzzyText(text) {
    const q = (text || '').toLowerCase().trim();
    const task = this.data.tasks.find(t => t.text.toLowerCase().includes(q));
    if (task) { this.deleteTask(task.id); return task; }
    return null;
  },

  setTaskPriorityByFuzzyText(text, priority) {
    const q = (text || '').toLowerCase().trim();
    const task = this.data.tasks.find(t => t.text.toLowerCase().includes(q));
    if (task) {
      task.priority = priority;
      this.emit('tasks:changed', this.data.tasks);
      this.scheduleAutosave();
      return task;
    }
    return null;
  },

  logCommand(transcript, responseText) {
    const entry = {
      id: 'c_' + Date.now().toString(36),
      transcript,
      response: responseText,
      timestamp: new Date().toISOString()
    };
    this.data.conversations.unshift(entry);
    if (this.data.conversations.length > 200) this.data.conversations.length = 200;
    this.emit('conversation:logged', entry);
    this.scheduleAutosave();
    return entry;
  },

  updateSettings(patch) {
    this.data.settings = Object.assign(this.data.settings, patch);
    this.emit('settings:changed', this.data.settings);
    this.scheduleAutosave();
  }
};
