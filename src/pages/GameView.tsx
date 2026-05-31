import { HUD } from '../components/hud';
import { PageFrame, SidebarLayout, MainContent } from '../components/layout';
import { LeftSidebar } from '../components/LeftSidebar';
import { RightSidebar } from '../components/RightSidebar';
import { BottomBar } from '../components/BottomBar';
import { MapCanvas } from '../components/MapCanvas';
import { TechTreeView } from '../components/TechTreeView';
import { MilitaryPanel, DiplomacyPanel, CourtPanel, ReligionPanel } from '../components/panels';
import { useGameLoop } from '../core/GameLoop';
import { ModalManager } from '../components/modals/ModalManager';
import { useGameStore } from '../store/gameStore';

export function GameView() {
  // Initialize the game loop hook
  useGameLoop();
  const { activeMenuTab } = useGameStore();

  return (
    <PageFrame>
      <HUD />
      
      <SidebarLayout>
        {activeMenuTab === 'REALM' && <LeftSidebar />}
        <MainContent>
          {activeMenuTab === 'TECH_MENU' ? (
            <TechTreeView />
          ) : activeMenuTab === 'MILITARY_MENU' ? (
            <MilitaryPanel />
          ) : activeMenuTab === 'DIPLOMACY_MENU' ? (
            <DiplomacyPanel />
          ) : activeMenuTab === 'COURT_MENU' ? (
            <CourtPanel />
          ) : activeMenuTab === 'RELIGION_MENU' ? (
            <ReligionPanel />
          ) : (
            <>
              <MapCanvas />
              <BottomBar />
            </>
          )}
        </MainContent>
        {activeMenuTab === 'REALM' && <RightSidebar />}
      </SidebarLayout>

      <ModalManager />
    </PageFrame>
  );
}
