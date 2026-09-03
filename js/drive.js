const JarvisDrive = {
  tokenClient: null,
  accessToken: null,
  gapiReady: false,
  gisReady: false,
  fileId: null,
  userProfile: null,

  async init() {
    if (!JARVIS_CONFIG.isConfigured) {
      JarvisState.emit('drive:unconfigured');
      return;
    }
    await this._loadGapiClient();
    this._initTokenClient();
  },

  _loadGapiClient() {
    return new Promise((resolve) => {
      const wait = setInterval(() => {
        if (window.gapi) {
          clearInterval(wait);
          gapi.load('client', async () => {
            await gapi.client.init({
              apiKey: JARVIS_CONFIG.API_KEY,
              discoveryDocs: [JARVIS_CONFIG.DISCOVERY_DOC]
            });
            this.gapiReady = true;
            resolve();
          });
        }
      }, 100);
    });
  },

  _initTokenClient() {
    if (!window.google || !window.google.accounts) {
      setTimeout(() => this._initTokenClient(), 200);
      return;
    }
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: JARVIS_CONFIG.CLIENT_ID,
      scope: JARVIS_CONFIG.DRIVE_SCOPE + ' https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (resp) => {
        if (resp.error) {
          JarvisState.emit('drive:auth_error', resp);
          return;
        }
        this.accessToken = resp.access_token;
        gapi.client.setToken({ access_token: this.accessToken });
        await this._fetchProfile();
        JarvisState.emit('drive:signed_in', this.userProfile);
        await this.loadMemory();
      }
    });
    this.gisReady = true;
    JarvisState.emit('drive:ready');
  },

  signIn() {
    if (!this.tokenClient) {
      JarvisState.emit('drive:not_ready');
      return;
    }
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  },

  signOut() {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    this.accessToken = null;
    this.userProfile = null;
    this.fileId = null;
    JarvisState.emit('drive:signed_out');
  },

  async _fetchProfile() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + this.accessToken }
      });
      this.userProfile = await res.json();
    } catch (e) {
      this.userProfile = null;
    }
  },

  get isSignedIn() {
    return !!this.accessToken;
  },

  async loadMemory() {
    try {
      JarvisState.emit('drive:sync_start');
      const found = await this._findDataFile();
      if (found) {
        this.fileId = found.id;
        const content = await this._downloadFile(found.id);
        JarvisState.hydrate(content);
      } else {
        const created = await this._createDataFile(createEmptyMemory());
        this.fileId = created.id;
        JarvisState.hydrate(createEmptyMemory());
      }
      JarvisState.emit('drive:sync_success', { at: new Date().toISOString() });
    } catch (err) {
      console.error('Errore caricamento memoria da Drive:', err);
      JarvisState.emit('drive:sync_error', err);
    }
  },

  async saveMemory() {
    if (!this.isSignedIn) return;
    try {
      JarvisState.emit('drive:sync_start');
      if (!this.fileId) {
        const found = await this._findDataFile();
        this.fileId = found ? found.id : (await this._createDataFile(JarvisState.data)).id;
      }
      await this._updateFile(this.fileId, JarvisState.data);
      JarvisState.emit('drive:sync_success', { at: new Date().toISOString() });
    } catch (err) {
      console.error('Errore salvataggio memoria su Drive:', err);
      JarvisState.emit('drive:sync_error', err);
    }
  },

  async _findDataFile() {
    const res = await gapi.client.drive.files.list({
      q: `name='${JARVIS_CONFIG.DATA_FILE_NAME}' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, modifiedTime)'
    });
    const files = res.result.files || [];
    return files.length ? files[0] : null;
  },

  async _createDataFile(obj) {
    const boundary = 'jarvis_boundary_' + Date.now();
    const metadata = { name: JARVIS_CONFIG.DATA_FILE_NAME, mimeType: 'application/json' };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(obj)}\r\n` +
      `--${boundary}--`;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.accessToken,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    });
    return res.json();
  },

  async _updateFile(fileId, obj) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + this.accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(obj)
    });
    return res.json();
  },

  async _downloadFile(fileId) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: 'Bearer ' + this.accessToken }
    });
    return res.json();
  }
};

JarvisState.on('autosave:trigger', () => {
  if (JarvisDrive.isSignedIn) {
    JarvisDrive.saveMemory();
  }
});
