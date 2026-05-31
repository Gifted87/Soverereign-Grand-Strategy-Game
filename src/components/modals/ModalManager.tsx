import { useGameStore } from '../../store/gameStore';
import { BudgetModal } from './index';
import { CharacterModal, HeirModal, MarriageModal } from './CharacterModals';
import { ArmyModal, BattleModal, RazeModal } from './MilitaryModals';
import { DiplomacyModal, SpyMissionModal, TradeModal } from './DiplomacyModals';
import { SettlementModal, LawsModal, WorldMapModal } from './RealmModals';
import { TechnologyModal, ReligionModal, ChronicleModal, CrisisModal, CouncilModal, EstateModal } from './StateModals';
import { GameMenuModal } from './GameMenuModal';

export function ModalManager() {
  const { activeModal, closeModal, modalProps } = useGameStore();

  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 md:p-8">
      <div className="bg-ink border border-stone max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl relative rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-40 animate-pulse" />
        
        {/* Custom rounded modern close button */}
        <button 
          onClick={closeModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-ink-light border border-stone text-stone-light hover:text-parchment flex items-center justify-center transition-all cursor-pointer text-lg font-semibold leading-none shadow-sm hover:border-stone-light/45"
        >
          &times;
        </button>

        <div className="p-6 md:p-8 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-stone/30 font-sans">
          {activeModal === 'EVENT' && (
            <div className="text-center space-y-6 max-w-xl mx-auto py-6">
              <h1 className="font-serif text-3xl text-parchment tracking-wide font-semibold">{modalProps?.title || 'An Event Occurs'}</h1>
              <p className="font-sans text-stone-light text-[13px] md:text-[14px] leading-relaxed text-justify bg-ink-lighter border border-stone/20 p-5 rounded-xl shadow-inner italic">
                "{modalProps?.description || 'The realm holds its breath as new omens appear.'}"
              </p>
              <div className="space-y-4 pt-6">
                <button 
                  onClick={closeModal} 
                  className="w-full max-w-md mx-auto block py-3 px-6 bg-accent text-ink hover:bg-accent/90 border border-accent hover:shadow-[0_2px_12px_rgba(217,119,87,0.3)] hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-widest font-sans text-xs font-semibold rounded-lg cursor-pointer"
                >
                  So it shall be
                </button>
              </div>
            </div>
          )}
          {activeModal === 'BUDGET' && <BudgetModal />}
          {activeModal === 'CHARACTER' && <CharacterModal />}
          {activeModal === 'HEIR' && <HeirModal />}
          {activeModal === 'MARRIAGE' && <MarriageModal />}
          {activeModal === 'ARMY' && <ArmyModal />}
          {activeModal === 'BATTLE' && <BattleModal />}
          {activeModal === 'RAZE' && <RazeModal />}
          {activeModal === 'DIPLOMACY' && <DiplomacyModal />}
          {activeModal === 'SPY_MISSION' && <SpyMissionModal />}
          {activeModal === 'TRADE' && <TradeModal />}
          {activeModal === 'SETTLEMENT' && <SettlementModal />}
          {activeModal === 'LAWS' && <LawsModal />}
          {activeModal === 'WORLD_MAP' && <WorldMapModal />}
          {activeModal === 'TECHNOLOGY' && <TechnologyModal />}
          {activeModal === 'RELIGION' && <ReligionModal />}
          {activeModal === 'CHRONICLE' && <ChronicleModal />}
          {activeModal === 'CRISIS' && <CrisisModal />}
          {activeModal === 'COUNCIL' && <CouncilModal />}
          {activeModal === 'ESTATE' && <EstateModal />}
          {activeModal === 'GAME_MENU' && <GameMenuModal />}
        </div>
      </div>
    </div>
  );
}
