const JarvisNotes = {
  editingId: null,

  init() {
    document.getElementById('note-new-btn').addEventListener('click', () => this.openEditor());
    document.getElementById('note-cancel-btn').addEventListener('click', () => this.closeEditor());
    document.getElementById('note-save-btn').addEventListener('click', () => this.saveFromEditor());
    document.getElementById('note-search').addEventListener('input', (e) => this.render(e.target.value));

    JarvisState.on('notes:changed', () => this.render(document.getElementById('note-search').value));
  },

  openEditor(note) {
    this.editingId = note ? note.id : null;
    document.getElementById('note-title-input').value = note ? note.title : '';
    document.getElementById('note-body-input').value = note ? note.body : '';
    document.getElementById('note-editor').classList.remove('hidden');
    document.getElementById('note-title-input').focus();
  },

  closeEditor() {
    this.editingId = null;
    document.getElementById('note-editor').classList.add('hidden');
  },

  saveFromEditor() {
    const title = document.getElementById('note-title-input').value;
    const body = document.getElementById('note-body-input').value;
    if (!title.trim() && !body.trim()) { this.closeEditor(); return; }

    if (this.editingId) {
      JarvisState.updateNote(this.editingId, { title, body });
    } else {
      JarvisState.addNote(title, body);
    }
    this.closeEditor();
  },

  deleteNote(id) {
    JarvisState.deleteNote(id);
  },

  render(query) {
    const list = document.getElementById('notes-list');
    const notes = JarvisState.searchNotes(query);
    list.innerHTML = '';

    if (!notes.length) {
      list.innerHTML = `<div class="empty-hint" style="padding:16px;">Nessuna nota trovata. Crea la tua prima nota, oppure di': "Jarvis, nota ...".</div>`;
    } else {
      notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `
          <h3>${escapeHtml(note.title)}</h3>
          <p>${escapeHtml(note.body)}</p>
          <div class="note-meta">
            <span class="note-date">${formatDate(note.updatedAt)}</span>
            <span class="note-actions">
              <button data-action="edit" title="Modifica">✎</button>
              <button data-action="delete" title="Elimina">✕</button>
            </span>
          </div>
        `;
        card.querySelector('[data-action="edit"]').addEventListener('click', () => this.openEditor(note));
        card.querySelector('[data-action="delete"]').addEventListener('click', () => this.deleteNote(note.id));
        list.appendChild(card);
      });
    }

    const homeList = document.getElementById('home-recent-notes');
    if (homeList) {
      const recent = JarvisState.data.notes.slice(0, 4);
      homeList.innerHTML = recent.length
        ? recent.map(n => `<li>${escapeHtml(n.title)}</li>`).join('')
        : '<li class="empty-hint">Nessuna nota ancora. Prova a dire "Jarvis, nota idea..."</li>';
    }
    const miniCount = document.getElementById('mini-notes-count');
    if (miniCount) miniCount.textContent = JarvisState.data.notes.length;
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) + ' · ' +
           d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
  }
