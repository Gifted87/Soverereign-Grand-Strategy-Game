import { useGameStore } from '../store/gameStore';
import { clsx } from "clsx";

export function BottomBar() {
  const { currentDay, currentYear, togglePause, isPaused, speed, setSpeed, chronicle } = useGameStore();

  const handleSpeed = (s: number) => {
    if (isPaused) togglePause();
    setSpeed(s);
  };

  return (
    <footer className="h-12 bg-ink/95 backdrop-blur-md border-t border-stone/35 flex items-center shrink-0 w-full overflow-hidden absolute bottom-0 left-0 right-0 z-10 pointer-events-auto shadow-[0_-4px_24px_rgba(0,0,0,0.45)]">
      
      {/* Chronicle Ticker */}
      <div className="flex-1 overflow-hidden h-full flex items-center">
        <div className="animate-ticker whitespace-nowrap pl-full flex gap-12">
          {chronicle.map(entry => (
            <span key={entry.id} className="text-xs font-serif font-medium tracking-wide">
              <span className="text-stone-light opacity-65 mr-2">
                Y{entry.year} D{entry.day} — 
              </span>
              <span className={clsx(
                  entry.type === 'URGENT' && "text-danger font-bold drop-shadow-[0_0_2px_rgba(196,97,106,0.3)]",
                  entry.type === 'FLAVOR' && "text-gold italic",
                  entry.type === 'CRITICAL' && "text-parchment font-semibold"
              )}>
                {entry.text}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Speed Controls using UI Kit pills button style */}
      <div className="flex items-center h-full border-l border-stone/20 bg-ink-light px-2 gap-1.5 shrink-0">
        <button 
          onClick={togglePause}
          className={clsx(
            "w-8 h-8 rounded-md flex items-center justify-center text-xs font-sans transition-all active:scale-95 shadow-sm",
            isPaused 
              ? "bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30" 
              : "bg-panel border border-stone/30 hover:border-accent text-stone-light hover:text-parchment"
          )}
          title={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? "⏸" : "▶"}
        </button>
        {[1, 2, 5, 20].map(s => (
          <button 
            key={s}
            onClick={() => handleSpeed(s)}
            className={clsx(
              "px-2.5 h-8 rounded-md text-[10px] font-mono transition-all font-bold active:scale-95 border",
              !isPaused && speed === s 
                ? 'bg-accent text-ink border-accent shadow-[0_2px_10px_rgba(217,119,87,0.35)]' 
                : 'bg-panel border-stone/30 hover:border-parchment hover:bg-panel/80 text-stone-light hover:text-parchment'
            )}
            title={`Speed x${s}`}
          >
            ×{s}
          </button>
        ))}
      </div>
    </footer>
  );
}
