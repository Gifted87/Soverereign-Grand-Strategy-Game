import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Shield, Volume2, VolumeX, Eye, HelpCircle, 
  Trash2, Download, Upload, Copy, Check, Sliders, RefreshCw 
} from 'lucide-react';

export function Settings() {
  const navigate = useNavigate();
  
  // Real storage of local state configuration settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(70);
  const [mapRenderDetails, setMapRenderDetails] = useState('stylized');
  const [activeTheme, setActiveTheme] = useState('emerald');
  const [autosaveInterval, setAutosaveInterval] = useState(3); // days
  
  // Backup / Data status
  const [importText, setImportText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const [successSave, setSuccessSave] = useState(false);

  // Load current settings from localStorage on mount
  useEffect(() => {
    try {
      const storedMute = localStorage.getItem('sovereign_sound_mute');
      if (storedMute) setSoundEnabled(storedMute === 'false' ? false : true);
      
      const storedVolume = localStorage.getItem('sovereign_music_vol');
      if (storedVolume) setMusicVolume(parseInt(storedVolume, 10));

      const storedDetails = localStorage.getItem('sovereign_map_details');
      if (storedDetails) setMapRenderDetails(storedDetails);

      const storedTheme = localStorage.getItem('sovereign_active_theme');
      if (storedTheme) setActiveTheme(storedTheme);

      const storedAutosave = localStorage.getItem('sovereign_autosave');
      if (storedAutosave) setAutosaveInterval(parseInt(storedAutosave, 10));
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e);
    }
  }, []);

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('sovereign_sound_mute', soundEnabled ? 'true' : 'false');
      localStorage.setItem('sovereign_music_vol', musicVolume.toString());
      localStorage.setItem('sovereign_map_details', mapRenderDetails);
      localStorage.setItem('sovereign_active_theme', activeTheme);
      localStorage.setItem('sovereign_autosave', autosaveInterval.toString());
      
      // Flash a gorgeous success indicator
      setSuccessSave(true);
      setTimeout(() => setSuccessSave(false), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  const handleExportSaves = () => {
    try {
      const raw = localStorage.getItem('sovereign_saves');
      if (!raw) {
        alert("You have no existing dynastic saves to export!");
        return;
      }
      navigator.clipboard.writeText(raw);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (e) {
      console.error('Failed to export saves:', e);
      alert('Failed to write saves payload to clipboard.');
    }
  };

  const handleImportSaves = () => {
    if (!importText.trim()) return;
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) {
        throw new Error('Payload must be a saves array');
      }
      localStorage.setItem('sovereign_saves', JSON.stringify(parsed));
      setImportStatus({ type: 'success', text: `Grand scrolls restored! ${parsed.length} save slots updated.` });
      setImportText('');
    } catch (e) {
      setImportStatus({ type: 'error', text: 'Invalid scroll data! Verify the decrypted save payload.' });
    }
  };

  const handleWipeSaves = () => {
    localStorage.removeItem('sovereign_saves');
    setWipeConfirm(false);
    alert('Every previous dynasty recorded on this device has been abolished.');
  };

  return (
    <div className="min-h-screen bg-ink text-parchment font-body flex flex-col border-[12px] border-ink-light selection:bg-gold selection:text-ink select-none relative overflow-y-auto pb-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="py-6 border-b border-stone/30 bg-ink-light flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-gold animate-pulse" />
          <div>
            <h1 className="font-header text-lg uppercase tracking-[0.25em] text-gold">Sovereign Chronicles</h1>
            <p className="text-[10px] uppercase font-sans tracking-widest text-stone-light">Court Configuration &amp; Backup Scrolls</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 border border-stone/50 bg-ink px-4 py-2 text-xs font-sans uppercase tracking-widest text-stone-light hover:text-gold hover:border-gold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Main Menu
        </button>
      </header>

      {/* Main Panel Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-8 z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: Gameplay Settings */}
        <div className="md:col-span-2 space-y-6 bg-ink-light/50 border border-stone/20 p-6 rounded-lg shadow-sm">
          <div>
            <h2 className="font-display text-xl text-gold pb-1 border-b border-stone/15 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-gold" />
              Sovereign Directives
            </h2>
            <p className="text-[11px] text-stone-light mt-1">Configure audio layers and visual state mechanics below.</p>
          </div>

          <div className="space-y-5">
            {/* Audio Settings container */}
            <div className="space-y-3">
              <label className="block text-[10px] uppercase tracking-widest text-gold font-bold">Acoustic Landscapes</label>
              
              <div className="bg-ink p-4 border border-stone/20 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 rounded-full border border-stone/50 bg-ink-light hover:text-gold transition-colors cursor-pointer"
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-gold" /> : <VolumeX className="w-4 h-4 text-stone" />}
                  </button>
                  <div>
                    <span className="text-xs font-bold font-serif text-parchment">Enable Sound Assets</span>
                    <span className="text-[10px] block text-stone-light">Toggle music strings, interface snaps.</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={soundEnabled} 
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-stone text-gold accent-gold focus:ring-0" 
                />
              </div>

              <div className="bg-ink p-4 border border-stone/20 rounded-md space-y-2">
                <div className="flex justify-between items-center text-xs text-stone-light">
                  <span className="font-serif">Atmospheric Music Level</span>
                  <span className="font-mono text-gold font-bold">{soundEnabled ? `${musicVolume}%` : 'Muted'}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  disabled={!soundEnabled}
                  value={musicVolume} 
                  onChange={(e) => setMusicVolume(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-stone/20 rounded-lg appearance-none cursor-pointer accent-gold disabled:opacity-30" 
                />
              </div>
            </div>

            {/* Visual Overlays container */}
            <div className="space-y-3">
              <label className="block text-[10px] uppercase tracking-widest text-gold font-bold">Cartography Details</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'stylized', title: 'Stylized Canvas', desc: 'Warm traditional painted map surfaces.' },
                  { id: 'minimal', title: 'Tactical Parchment', desc: 'Flat retro wood-print overlays.' }
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setMapRenderDetails(m.id)}
                    className={`p-3 border rounded-md cursor-pointer transition-all flex flex-col justify-between ${
                      mapRenderDetails === m.id
                        ? 'border-gold bg-gold/5 text-gold'
                        : 'border-stone/20 bg-ink text-stone hover:text-stone-light hover:border-stone-light'
                    }`}
                  >
                    <span className="text-xs font-serif font-bold">{m.title}</span>
                    <p className="text-[9px] text-stone-light leading-relaxed mt-1">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feudal Theme container */}
            <div className="space-y-3">
              <label className="block text-[10px] uppercase tracking-widest text-gold font-bold">Applet Color Motifs</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'emerald', hex: 'bg-emerald-800', label: 'Moss' },
                  { id: 'blood', hex: 'bg-red-800', label: 'Crimson' },
                  { id: 'sapphire', hex: 'bg-sky-800', label: 'Glacial' },
                  { id: 'imperial', hex: 'bg-amber-600', label: 'Gold' }
                ].map((th) => (
                  <div
                    key={th.id}
                    onClick={() => setActiveTheme(th.id)}
                    className={`p-2 border rounded-md text-center cursor-pointer transition-all ${
                      activeTheme === th.id
                        ? 'border-gold bg-stone/20 font-bold text-gold'
                        : 'border-stone/20 bg-ink text-stone-light hover:border-stone-light'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${th.hex} border border-stone/10`} />
                    <span className="text-[10px] uppercase tracking-wider block">{th.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-stone/15 flex justify-end items-center gap-3">
              <AnimatePresence>
                {successSave && (
                  <motion.span 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-emerald-500 text-xs font-serif flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Directives preserved
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                onClick={handleSaveSettings}
                className="px-6 py-2.5 bg-gold text-ink font-serif text-sm font-bold border border-gold hover:bg-gold/90 transition-all rounded shadow-md cursor-pointer"
              >
                Apply Directives
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Dynamic Backup Scrolls */}
        <div className="space-y-6 bg-ink-light/50 border border-stone/20 p-6 rounded-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl text-gold pb-1 border-b border-stone/15 flex items-center gap-2">
                <Download className="w-5 h-5 text-gold" />
                Backup Scrolls
              </h2>
              <p className="text-[11px] text-stone-light mt-1">Export your sagas or restore records from foreign domains.</p>
            </div>

            <div className="space-y-4">
              {/* Export */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-stone-light block">Copy Current Dynasty Scrolls</span>
                <button
                  onClick={handleExportSaves}
                  className="w-full flex items-center justify-center gap-2 border border-stone/50 hover:border-gold hover:text-gold bg-ink px-4 py-2.5 text-xs font-sans uppercase tracking-widest text-parchment rounded transition-all cursor-pointer"
                >
                  {copySuccess ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copySuccess ? 'Decrypted Copy Saved' : 'Export Sagas Payload'}
                </button>
              </div>

              {/* Import Area */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-stone-light block">Cryptic Import Script</span>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste export payload text code here..."
                  className="w-full h-24 bg-ink border border-stone/35 p-2 rounded focus:outline-none focus:border-gold text-[10px] font-mono select-text"
                />
                <button
                  onClick={handleImportSaves}
                  disabled={!importText.trim()}
                  className="w-full flex items-center justify-center gap-2 border border-gold/75 bg-gold/10 hover:bg-gold hover:text-ink disabled:opacity-40 disabled:hover:bg-gold/10 disabled:hover:text-gold text-gold py-2 text-xs font-sans uppercase tracking-widest rounded transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Import Saga Data
                </button>
              </div>

              {importStatus && (
                <div className={`p-3 rounded-md border text-[11px] leading-relaxed ${
                  importStatus.type === 'success' 
                    ? 'bg-emerald-950/25 border-emerald-800/40 text-emerald-400' 
                    : 'bg-red-950/25 border-red-800/40 text-rose-400'
                }`}>
                  {importStatus.text}
                </div>
              )}
            </div>
          </div>

          {/* Destroy Button at very bottom */}
          <div className="pt-4 border-t border-stone/15 mt-4">
            {wipeConfirm ? (
              <div className="bg-red-950/25 border border-red-900/40 p-4 rounded text-center">
                <p className="text-xs text-rose-400 font-serif mb-2">Completely execute factory wipe of every save slot? This is irreversible!</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleWipeSaves}
                    className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-parchment text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer"
                  >
                    Abolish All
                  </button>
                  <button
                    onClick={() => setWipeConfirm(false)}
                    className="px-3 py-1.5 bg-ink border border-stone/30 hover:bg-stone/10 text-stone-light text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer"
                  >
                    Spare Sagas
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setWipeConfirm(true)}
                className="w-full flex items-center justify-center gap-2 border border-rose-900/40 text-rose-400 hover:bg-rose-500/10 py-2.5 text-xs font-sans uppercase tracking-widest rounded transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Abolish Every Save Slot
              </button>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
