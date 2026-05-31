import { useGameStore } from '../../store/gameStore';
import { TreasuryBalanceChart } from '../charts';

export function BudgetModal() {
    const { currentDay } = useGameStore();

    // Mock data for chart
    const data = Array.from({length: 30}).map((_, i) => ({
        day: currentDay - 30 + i,
        balance: 1000 + Math.sin(i * 0.5) * 200 + i * 50
    }));

    return (
        <div className="p-2 space-y-6">
            <h2 className="text-2xl text-accent font-serif font-semibold text-center mb-6">The Royal Treasury</h2>
            
            <div className="border border-stone bg-ink-lighter p-4 rounded-xl shadow-sm">
                <TreasuryBalanceChart data={data} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm">
                <div className="border border-stone bg-ink-lighter p-5 rounded-xl space-y-3.5 shadow-sm">
                    <h3 className="uppercase tracking-widest text-stone-light border-b border-stone/15 mb-3 pb-1.5 font-semibold font-mono text-[11px]">Royal Income</h3>
                    <div className="flex justify-between py-1"><span className="text-parchment">Taxes & Tithes</span><span className="text-emerald-400 font-mono font-bold">+ 45.5</span></div>
                    <div className="flex justify-between py-1"><span className="text-parchment">Trade Tariffs</span><span className="text-emerald-400 font-mono font-bold">+ 12.0</span></div>
                    <div className="flex justify-between py-1 font-bold pt-3 border-t border-stone/15 mt-2"><span className="text-parchment">Total</span><span className="text-emerald-400 font-mono font-bold">+ 57.5</span></div>
                </div>
                <div className="border border-stone bg-ink-lighter p-5 rounded-xl space-y-3.5 shadow-sm">
                    <h3 className="uppercase tracking-widest text-stone-light border-b border-stone/15 mb-3 pb-1.5 font-semibold font-mono text-[11px]">Royal Expenses</h3>
                    <div className="flex justify-between py-1"><span className="text-parchment">Army Upkeep</span><span className="text-danger font-mono font-bold">- 30.0</span></div>
                    <div className="flex justify-between py-1"><span className="text-parchment">Court & Staff</span><span className="text-danger font-mono font-bold">- 15.0</span></div>
                    <div className="flex justify-between py-1 font-bold pt-3 border-t border-stone/15 mt-2"><span className="text-parchment">Total</span><span className="text-danger font-mono font-bold">- 45.0</span></div>
                </div>
            </div>

            <div className="text-center pt-4 border-t border-stone/10 flex justify-center items-center gap-4">
                <span className="uppercase text-stone-light tracking-widest text-xs font-semibold font-mono">Net Surplus Balance:</span>
                <span className="text-2xl font-serif text-emerald-400 font-bold">+ 12.5 <span className="text-xs text-stone-light/60 font-mono font-medium">Gold/day</span></span>
            </div>
        </div>
    )
}
