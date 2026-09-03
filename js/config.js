const JARVIS_CONFIG = {
  DATA_FILE_NAME: 'jarvis_data.json',
  DRIVE_SCOPE: 'https://www.googleapis.com/auth/drive.file',
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  CLIENT_ID: localStorage.getItem('jarvis_client_id') || '',
  API_KEY: localStorage.getItem('jarvis_api_key') || '',
  get isConfigured() {
    return !!(this.CLIENT_ID && this.API_KEY);
  },
  save(clientId, apiKey) {
    this.CLIENT_ID = clientId.trim();
    this.API_KEY = apiKey.trim();
    localStorage.setItem('jarvis_client_id', this.CLIENT_ID);
    localStorage.setItem('jarvis_api_key', this.API_KEY);
  }
};

function createEmptyMemory() {
  return {
    version: 1,
    notes: [],
    tasks: [],
    settings: {
      voiceRepliesEnabled: true,
      wakeWord: 'jarvis',
      language: 'it-IT'
    },
    conversations: []
  };
}
