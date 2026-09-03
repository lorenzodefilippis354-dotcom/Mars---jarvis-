const JarvisTasks = {
  init() {
    document.getElementById('task-add-btn').addEventListener('click', () => this.addFromInput());
    document.getElementById('task-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addFromInput();
    });

    JarvisState.on('tasks:changed', () => this.render());
  },

  addFromInput() {
    const input = document.getElementById('task-input');
    const priority = document.getElementById('task-priority-input').value;
    if (!input.value.trim()) return;
    JarvisState.addTask(input.value, priority);
    input.value = '';
  },

  render() {
    const pendingList = document.getElementById('tasks-pending-list');
    const doneList = document.getElementById('tasks-done-list');
    pendingList.innerHTML = '';
    doneList.innerHTML = '';

    const pending = JarvisState.data.tasks.filter(t => !t.done)
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
    const done = JarvisState.data.tasks.filter(t => t.done);

    if (!pending.length) {
      pendingList.innerHTML = '<li class="empty-hint">Nessun compito in sospeso.</li>';
    } else {
      pending.forEach(t => pendingList.appendChild(buildTaskItem(t)));
    }

    if (!done.length) {
      doneList.innerHTML = '<li class="empty-hint">Ancora nessun compito completato.</li>';
    } else {
      done.forEach(t => doneList.appendChild(buildTaskItem(t)));
    }

    const homeList = document.getElementById('home-recent-tasks');
    if (homeList) {
      const activeTasks = pending.slice(0, 4);
      homeList.innerHTML = activeTasks.length
        ? activeTasks.map(t => `<li>${escapeHtml(t.text)}</li>`).join('')
        : '<li class="empty-hint">Nessun compito attivo.</li>';
    }
    const miniCount = document.getElementById('mini-tasks-count');
    if (miniCount) miniCount.textContent = pending.length;
  }
};

function priorityRank(p) { return p === 'high' ? 3 : p === 'medium' ? 2 : 1; }

function priorityLabel(p) { return p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Bassa'; }

function buildTaskItem(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.done ? ' done' : '');
  li.dataset.priority = task.priority;
  li.innerHTML = `
    <span class="task-text">${escapeHtml(task.text)}</span>
    <span class="priority-pill">${priorityLabel(task.priority)}</span>
    <button data-action="toggle" title="Completa/riapri">${task.done ? '↺' : '✓'}</button>
    <button data-action="delete" title="Elimina">✕</button>
  `;
  li.querySelector('[data-action="toggle"]').addEventListener('click', () => JarvisState.completeTaskById(task.id));
  li.querySelector('[data-action="delete"]').addEventListener('click', () => JarvisState.deleteTask(task.id));
  return li;
  }
