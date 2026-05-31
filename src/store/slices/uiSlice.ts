import { StateCreator } from 'zustand';

export type ModalType = 'CHARACTER' | 'SETTLEMENT' | 'ARMY' | 'BATTLE' | 'DIPLOMACY' | 'MARRIAGE' | 'TRADE' | 'SPY_MISSION' | 'TECHNOLOGY' | 'LAWS' | 'BUDGET' | 'RELIGION' | 'CHRONICLE' | 'WORLD_MAP' | 'CRISIS' | 'COUNCIL' | 'EVENT' | 'HEIR' | 'ESTATE' | 'RAZE' | 'GAME_MENU';

export type RightSidebarTab = 'MILITARY' | 'DIPLOMACY' | 'EVENTS' | 'INTEL' | 'COURT';
export type MenuTab = 'REALM' | 'MILITARY_MENU' | 'DIPLOMACY_MENU' | 'COURT_MENU' | 'RELIGION_MENU' | 'TECH_MENU';
export type MapOverlay = 'TERRAIN' | 'POLITICAL' | 'ECONOMY' | 'POPULATION' | 'MILITARY' | 'RELIGION' | 'DISEASE' | 'TRADE_ROUTES' | 'FERTILITY' | 'ELEVATION' | 'PLATES' | 'CLIMATE';

export interface UISlice {
  activeModal: ModalType | null;
  modalProps: any;
  rightSidebarTab: RightSidebarTab;
  activeMenuTab: MenuTab;
  activeMapOverlay: MapOverlay;
  
  openModal: (type: ModalType, props?: any) => void;
  closeModal: () => void;
  setRightSidebarTab: (tab: RightSidebarTab) => void;
  setMenuTab: (tab: MenuTab) => void;
  setMapOverlay: (overlay: MapOverlay) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  activeModal: null,
  modalProps: {},
  rightSidebarTab: 'EVENTS',
  activeMenuTab: 'REALM',
  activeMapOverlay: 'TERRAIN',

  openModal: (type, props = {}) => set({ activeModal: type, modalProps: props }),
  closeModal: () => set({ activeModal: null, modalProps: {} }),
  setRightSidebarTab: (tab) => set({ rightSidebarTab: tab }),
  setMenuTab: (tab) => set({ activeMenuTab: tab }),
  setMapOverlay: (overlay) => set({ activeMapOverlay: overlay }),
});
