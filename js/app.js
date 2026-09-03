const JarvisApp = {
  currentSection: 'home',

  init() {
    this._bindNav();
    this._bindSettingsPanel();
    this._startClock();
    JarvisNotes.init();
    JarvisTasks.init();
    JarvisVoice.init();
    this._bindDriveEvents();

    this._bootSequence();
  },

  async _bootSequence() {
    const statusEl = document.getElementById('boot-status');
    const steps = [
      'Inizializzazione nucleo...',
      'Caricamento interfaccia HUD...',
      'Verifica configurazione Google Drive...',
    ];
    for (const s of steps) {
      statusEl.textContent = s;
      await sleep(380);
    }

    if (JARVIS_CONFIG.isConfigured) {
      await JarvisDrive.init();
    } else {
      statusEl.textContent = 'Configurazione Google mancante — vai su Impostazioni.';
      await sleep(500);
    }

    document.getElementById('boot-overlay').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('boot-overlay').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
    }, 500);

    JarvisNotes.render('');
    JarvisTasks.render();
    renderCommandFeed('home-command-feed', 6);
  },

  _bindNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.navigateTo(btn.dataset.section));
    });
  },

  navigateTo(section) {
    if (!document.getElementById('view-' + section)) return;
    this.currentSection = section;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === section));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + section));
  },

  _startClock() {
    const tick = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('it-IT');
      const dateStr = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const clockEl = document.getElementById('clock');
      const homeDateEl = document.getElementById('home-datetime');
      if (clockEl) clockEl.textContent = timeStr;
      if (homeDateEl) homeDateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1) + ' · ' + timeStr;
    };
    tick();
    setInterval(tick, 1000);
  },

  _bindSettingsPanel() {
    document.getElementById('settings-client-id').value = JARVIS_CONFIG.CLIENT_ID;
    document.getElementById('settings-api-key').value = JARVIS_CONFIG.API_KEY;

    document.getElementById('settings-save-config-btn').addEventListener('click', () => {
      const clientId = document.getElementById('settings-client-id').value;
      const apiKey = document.getElementById('settings-api-key').value;
      JARVIS_CONFIG.save(clientId, apiKey);
      alert('Configurazione salvata. Ricarico M.A.R.S. per applicarla...');
      location.reload();
    });

    document.getElementById('settings-signin-btn').addEventListener('click', () => JarvisDrive.signIn());
    document.getElementById('settings-signout-btn').addEventListener('click', () => JarvisDrive.signOut());
    document.getElementById('settings-force-sync-btn').addEventListener('click', () => JarvisDrive.saveMemory());

    document.getElementById('settings-voice-replies').addEventListener('change', (e) => {
      JarvisVoice.isMuted = !e.target.checked;
      JarvisState.updateSettings({ voiceRepliesEnabled: e.target.checked });
      JarvisVoice._syncMuteUI();
    });
  },

  _bindDriveEvents() {
    JarvisState.on('drive:signed_in', (profile) => {
      this._setDriveConnected(true);
      if (profile) {
        document.getElementById('account-name').textContent = profile.name || 'Utente Google';
        document.getElementById('account-email').textContent = profile.email || '';
        document.getElementById('user-greeting-name').textContent = (profile.given_name || profile.name || 'Comandante').split(' ')[0];
        const avatar = document.getElementById('account-avatar');
        if (profile.picture) {
          avatar.innerHTML = `<img src="${profile.picture}" alt="avatar">`;
        } else {
          avatar.textContent = (profile.name || 'U').charAt(0).toUpperCase();
        }
        document.getElementById('settings-signin-btn').classList.add('hidden');
        document.getElementById('settings-signout-btn').classList.remove('hidden');
      }
    });

    JarvisState.on('drive:signed_out', () => {
      this._setDriveConnected(false);
      document.getElementById('account-name').textContent = 'Non connesso';
      document.getElementById('account-email').textContent = '—';
      document.getElementById('account-avatar').textContent = '?';
      document.getElementById('user-greeting-name').textContent = 'Comandante';
      document.getElementById('settings-signin-btn').classList.remove('hidden');
      document.getElementById('settings-signout-btn').classList.add('hidden');
    });

    JarvisState.on('drive:sync_start', () => {
      document.getElementById('home-sync-status').textContent = 'In corso...';
    });

    JarvisState.on('drive:sync_success', ({ at }) => {
      const t = new Date(at).toLocaleTimeString('it-IT');
      document.getElementById('home-sync-status').textContent = 'OK · ' + t;
      document.getElementById('settings-last-sync').textContent = t;
    });

    JarvisState.on('drive:sync_error', () => {
      document.getElementById('home-sync-status').textContent = 'Errore di sincronizzazione';
    });

    JarvisState.on('drive:unconfigured', () => {
      document.getElementById('home-drive-status').textContent = 'Da configurare';
    });
  },

  _setDriveConnected(connected) {
    const btn = document.getElementById('drive-status-btn');
    btn.dataset.state = connected ? 'connected' : 'disconnected';
    document.getElementById('drive-label').textContent = connected ? 'DRIVE ONLINE' : 'DRIVE OFFLINE';
    document.getElementById('home-drive-status').textContent = connected ? 'Connesso' : 'Disconnesso';
  }
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

document.addEventListener('DOMContentLoaded', () => JarvisApp.init());
