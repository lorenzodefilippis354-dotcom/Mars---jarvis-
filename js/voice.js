const JarvisVoice = {
  recognition: null,
  synth: window.speechSynthesis,
  isListening: false,
  isMuted: false,
  wakeWord: 'jarvis',
  awaitingCommand: false,
  awaitingTimer: null,

  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this._setTranscript('Riconoscimento vocale non supportato in questo browser. Prova Chrome desktop.');
      document.getElementById('voice-listen-toggle').disabled = true;
      document.getElementById('voice-talk-btn').disabled = true;
      return;
    }

    this.recognition = new SR();
    this.recognition.lang = 'it-IT';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (e) => this._handleResult(e);
    this.recognition.onerror = (e) => this._handleError(e);
    this.recognition.onend = () => {
      if (this.isListening) {
        try { this.recognition.start(); } catch (e) {}
      } else {
        this._setMicState('idle');
      }
    };

    document.getElementById('voice-talk-btn').addEventListener('click', () => this.listenOnce());
    document.getElementById('voice-mute-btn').addEventListener('click', () => this.toggleMute());
    document.getElementById('voice-listen-toggle').addEventListener('click', () => this.toggleContinuousListening());

    const savedMute = JarvisState.data.settings && JarvisState.data.settings.voiceRepliesEnabled === false;
    this.isMuted = !!savedMute;
    this._syncMuteUI();
  },

  toggleContinuousListening() {
    if (this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      this._setMicState('idle');
      document.getElementById('voice-listen-toggle').dataset.active = 'false';
      document.getElementById('voice-listen-toggle').textContent = '◉ Ascolto continuo: OFF';
    } else {
      this.isListening = true;
      try { this.recognition.start(); } catch (e) {}
      this._setMicState('listening');
      document.getElementById('voice-listen-toggle').dataset.active = 'true';
      document.getElementById('voice-listen-toggle').textContent = '◉ Ascolto continuo: ON';
      this._setTranscript('In attesa della parola di attivazione "Jarvis"...');
    }
  },

  listenOnce() {
    this.awaitingCommand = true;
    this._setMicState('active');
    this._setTranscript('Ti ascolto...');
    if (!this.isListening) {
      try { this.recognition.start(); } catch (e) {}
    }
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    JarvisState.updateSettings({ voiceRepliesEnabled: !this.isMuted });
    this._syncMuteUI();
  },

  _syncMuteUI() {
    const btn = document.getElementById('voice-mute-btn');
    btn.dataset.muted = this.isMuted;
    btn.textContent = this.isMuted ? '🔇 Risposte vocali: OFF' : '🔊 Risposte vocali: ON';
  },

  _handleResult(event) {
    let finalTranscript = '';
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += t;
      else interim += t;
    }

    if (interim) this._setTranscript(interim);

    if (finalTranscript) {
      const clean = finalTranscript.trim();
      this._setTranscript(clean);

      const lower = clean.toLowerCase();
      const wakeIdx = lower.indexOf(this.wakeWord);

      if (this.awaitingCommand) {
        this.awaitingCommand = false;
        this._processCommand(clean);
      } else if (wakeIdx !== -1) {
        const after = clean.slice(wakeIdx + this.wakeWord.length).replace(/^[,:\s-]+/, '');
        if (after) {
          this._processCommand(after);
        } else {
          this._setMicState('active');
          this._setTranscript('Sì? Dimmi pure...');
          this.awaitingCommand = true;
          clearTimeout(this.awaitingTimer);
          this.awaitingTimer = setTimeout(() => {
            this.awaitingCommand = false;
            this._setMicState(this.isListening ? 'listening' : 'idle');
          }, 6000);
        }
      }
    }
  },

  _handleError(e) {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    console.warn('Errore riconoscimento vocale:', e.error);
  },

  _setMicState(state) {
    document.getElementById('mic-indicator').dataset.state = state === 'idle' ? 'idle' : state;
    document.getElementById('mic-label').textContent =
      state === 'listening' ? 'IN ASCOLTO DI "JARVIS"' :
      state === 'active' ? 'RICEZIONE COMANDO...' : 'MICROFONO INATTIVO';
    const orb = document.getElementById('voice-orb');
    if (orb) orb.dataset.state = state;
    const homeVoice = document.getElementById('home-voice-status');
    if (homeVoice) homeVoice.textContent = state === 'idle' ? 'Inattivo' : state === 'listening' ? 'In ascolto' : 'Ricezione comando';
  },

  _setTranscript(text) {
    const el = document.getElementById('voice-transcript');
    if (el) el.textContent = text;
  },

  speak(text) {
    this._setTranscript(text);
    if (this.isMuted || !this.synth) return;
    this.synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'it-IT';
    utter.rate = 1.02;
    utter.pitch = 0.95;
    const orb = document.getElementById('voice-orb');
    utter.onstart = () => { if (orb) orb.dataset.state = 'speaking'; };
    utter.onend = () => { if (orb) orb.dataset.state = this.isListening ? 'listening' : 'idle'; };
    this.synth.speak(utter);
  },

  _processCommand(rawText) {
    const text = rawText.trim();
    const lower = text.toLowerCase();
    let response = '';

    if (/^(nota|prendi nota|salva nota|appunta)\b/.test(lower)) {
      const content = text.replace(/^(nota|prendi nota|salva nota|appunta)[:\s]*/i, '').trim();
      if (content) {
        JarvisState.addNote(null, content);
        response = 'Ho salvato la tua nota.';
      } else {
        response = 'Non ho capito cosa devo annotare.';
      }
    } else if (/^(mostra|apri|vai a)\s+(le\s+)?note|memoria/.test(lower)) {
      JarvisApp.navigateTo('notes');
      response = 'Ecco la tua memoria.';
    } else if (/^(mostra|apri|vai a)\s+(i\s+)?compiti/.test(lower)) {
      JarvisApp.navigateTo('tasks');
      response = 'Ecco i tuoi compiti.';
    } else if (/^(aggiungi|crea|nuovo)\s+compito\b/.test(lower)) {
      const content = text.replace(/^(aggiungi|crea|nuovo)\s+compito[:\s]*/i, '').trim();
      if (content) {
        JarvisState.addTask(content, 'medium');
        response = `Ho aggiunto il compito: ${content}.`;
      } else {
        response = 'Non ho capito quale compito aggiungere.';
      }
    } else if (/^(completa|segna come fatto|ho finito)\s*(il\s+)?compito\b/.test(lower)) {
      const content = text.replace(/^(completa|segna come fatto|ho finito)\s*(il\s+)?compito[:\s]*/i, '').trim();
      const task = JarvisState.completeTaskByFuzzyText(content);
      response = task ? `Ho completato: ${task.text}.` : 'Non ho trovato quel compito.';
    } else if (/^(elimina|rimuovi|cancella)\s*(il\s+)?compito\b/.test(lower)) {
      const content = text.replace(/^(elimina|rimuovi|cancella)\s*(il\s+)?compito[:\s]*/i, '').trim();
      const task = JarvisState.deleteTaskByFuzzyText(content);
      response = task ? `Ho eliminato: ${task.text}.` : 'Non ho trovato quel compito.';
    } else if (/priorit[aà]\s+(alta|media|bassa)/.test(lower)) {
      const m = lower.match(/priorit[aà]\s+(alta|media|bassa)/);
      const priorityMap = { alta: 'high', media: 'medium', bassa: 'low' };
      const content = text.replace(/priorit[aà]\s+(alta|media|bassa)/i, '').replace(/^(imposta|metti)?[:\s]*/i, '').trim();
      const task = JarvisState.setTaskPriorityByFuzzyText(content, priorityMap[m[1]]);
      response = task ? `Priorità impostata su ${m[1]} per: ${task.text}.` : 'Non ho trovato quel compito.';
    } else if (/che ore sono|dimmi l'ora|che ora e/.test(lower)) {
      response = `Sono le ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}.`;
    } else if (/^(vai a|apri)\s+(la\s+)?home/.test(lower)) {
      JarvisApp.navigateTo('home');
      response = 'Torno alla home.';
    } else if (/^(vai a|apri)\s+(le\s+)?impostazioni/.test(lower)) {
      JarvisApp.navigateTo('settings');
      response = 'Ecco le impostazioni.';
    } else {
      response = 'Non ho capito il comando. Puoi ripetere?';
    }

    JarvisState.logCommand(text, response);
    this.speak(response);
    this._setMicState(this.isListening ? 'listening' : 'idle');
  }
};

JarvisState.on('conversation:logged', () => {
  renderCommandFeed('home-command-feed', 6);
  renderCommandFeed('voice-command-history', 30);
});

function renderCommandFeed(elementId, limit) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const items = JarvisState.data.conversations.slice(0, limit);
  if (!items.length) {
    el.innerHTML = '<li class="empty-hint">Nessun comando ancora registrato.</li>';
    return;
  }
  el.innerHTML = items.map(c => `
    <li>
      <span class="cmd-text">"${escapeHtml(c.transcript)}" → ${escapeHtml(c.response)}</span>
      <time>${formatDate(c.timestamp)}</time>
    </li>
  `).join('');
        }
