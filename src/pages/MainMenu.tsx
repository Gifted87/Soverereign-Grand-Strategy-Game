import { useNavigate } from 'react-router-dom';

export function MainMenu() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen w-screen bg-ink text-parchment font-body select-none border-[12px] border-ink-light flex items-center justify-center relative">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--color-stone)_1px,_transparent_0)]" style={{ backgroundSize: '40px 40px' }} />
      <div className="z-10 flex flex-col items-center">
        <h1 className="text-[120px] font-bold text-gold italic font-serif leading-none tracking-widest drop-shadow-[0_0_15px_rgba(194,164,97,0.3)]">SOVEREIGN</h1>
        <p className="text-xl tracking-[0.3em] uppercase text-stone-light mt-4 mb-16 font-sans">The Living Chronicle</p>

        <div className="flex flex-col gap-4 w-64">
          <button 
            onClick={() => navigate('/new-game')}
            className="w-full py-3 border border-stone bg-ink-light hover:bg-stone hover:text-gold text-parchment font-sans tracking-widest uppercase transition-colors"
          >
            New Game
          </button>
          <button 
            onClick={() => navigate('/load-game')}
            className="w-full py-3 border border-stone bg-ink-light hover:bg-stone hover:text-gold text-parchment font-sans tracking-widest uppercase transition-colors"
          >
            Load Game
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="w-full py-3 border border-stone bg-ink-light hover:bg-stone hover:text-gold text-parchment font-sans tracking-widest uppercase transition-colors"
          >
            Settings
          </button>
          <button 
            onClick={() => navigate('/credits')}
            className="w-full py-3 border border-stone bg-ink-light hover:bg-stone hover:text-gold text-parchment font-sans tracking-widest uppercase transition-colors"
          >
            Credits
          </button>
        </div>
      </div>
    </div>
  );
}
