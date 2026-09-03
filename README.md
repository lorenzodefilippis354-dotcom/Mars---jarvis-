# M.A.R.S. — JARVIS OS · Fase 1

Sistema operativo AI personale, basato su browser, ispirato al JARVIS di Tony Stark.
Stack: HTML + CSS vanilla + JavaScript vanilla. Nessun backend: tutti i dati
persistenti vivono in un file jarvis_data.json su Google Drive.

## Come avviarlo

1. Configura Client ID e API Key su Google Cloud Console (Drive API abilitata)
2. Apri index.html tramite GitHub Pages o un server locale
3. Vai su Impostazioni, incolla Client ID e API Key, Salva
4. Accedi con Google e autorizza Drive

## Comandi vocali disponibili

- "Jarvis, nota [testo]" — salva una nota
- "Jarvis, mostra note"
- "Jarvis, aggiungi compito [testo]"
- "Jarvis, completa compito [testo]"
- "Jarvis, elimina compito [testo]"
- "Jarvis, che ore sono"
