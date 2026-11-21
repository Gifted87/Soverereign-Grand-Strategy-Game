# 👑 Sovereign: The Living Chronicle

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Web Workers](https://img.shields.io/badge/Concurrency-Web%20Workers-FF6F00?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Engine-Active%20Simulation-success)](#)

> **A high-fidelity, deterministic medieval grand strategy engine and emergent living chronicle.** 
> Rather than relying on scripted narrative sequences, *Sovereign* models the medieval world from bedrock geomorphology to the psychological trauma of individual feudal vassals. Dynasties rise, trade networks choke, plagues erupt along military lines, and empires fracture through self-organizing multi-agent interactions.

---

## 🏛️ Core Simulation Philosophy

*Sovereign* operates as an autonomous, multi-tiered systemic simulation running decoupled from the rendering pipeline. Every lord, peasant cohort, caravan, and river basin exists as an autonomous entity in a massive state graph.

`
       ┌────────────────────────────────────────────────────────┐
       │             TIER 4: CONTINENTAL MACRO-SYSTEMS          │
       │       Planetary Climate, Ocean Conveyors, Jet Streams  │
       └───────────────────────────┬────────────────────────────┘
                                   │ Modulates
       ┌───────────────────────────▼────────────────────────────┐
       │             TIER 3: NETWORK & TRADE CORRIDORS          │
       │      Caravan Highways, Maritime Straits, Biome Chains   │
       └───────────────────────────┬────────────────────────────┘
                                   │ Connects
       ┌───────────────────────────▼────────────────────────────┐
       │             TIER 2: GEOMORPHIC REGIONAL FEATURES       │
       │       River Basins, Volcanic Belts, Mountain Passes    │
       └───────────────────────────┬────────────────────────────┘
                                   │ Shapes
       ┌───────────────────────────▼────────────────────────────┐
       │             TIER 1: PROVINCE / HEX MICRO-STATES        │
       │       Soil Vitality, Disease Reservoir, Infrastructure │
       └───────────────────────────┬────────────────────────────┘
                                   │ Inhabited by
       ┌───────────────────────────▼────────────────────────────┐
       │          AUTONOMOUS NPC MULTI-AGENT COGNITION          │
       │   18+ Archetypes • Probabilistic Action Weight Engine  │
       │   Episodic Memory Graph • Trait Vectors • Ambition     │
       └────────────────────────────────────────────────────────┘
`

---

## ⚡ Key Highlights

### 1. 4-Tier Stochastic Environmental Engine
The physical world is not static terrain—it is an active participant in geopolitics:
- **Tier 1 (Local Hex / Province):** 21 simultaneous micro-state parameters including *soil vitality*, *water table saturation*, *infrastructure integrity*, *disease reservoir*, *biomass density*, *predator threat*, *ambient unrest*, and *snow cover*.
- **Tier 2 (Geographic Formations):** Dynamic river siltation, volcanic seismic activity, seasonal alpine pass blockages, and fjord navigation hazards.
- **Tier 3 (Network Corridors):** Trade route chokepoints, caravan vulnerability indices, and ecological disease propagation corridors.
- **Tier 4 (Continental Macro-Systems):** Ocean conveyor currents, jet stream disruptions, solar oscillations, and catastrophic volcanic winters.
- **Autonomous Feedback Loops:** Emergent cross-tier cascades (e.g., intensive deforestation causing river silting, flash floods, harbor destruction, and subsequent urban grain famines).

### 2. Multi-Agent Cognitive NPC Architecture
NPCs are not scripted stat blocks; they are autonomous cognitive agents governed by an **Action Weight Engine**:
- **Continuous State Vectors:** Floating values (0–100) drifting toward character-specific baselines (ambition, paranoia, piety, stress, loyalty, greed, martial confidence).
- **Relational Memory System:** Characters record significant episodic events (*Betrayals*, *Battle Defeats*, *Bribes*, *Massacres*, *Pardons*) with intensity, decay rates, and emotional valences (POSITIVE, NEGATIVE, NEUTRAL, TRAUMATIC).
- **18 Specialized Archetypes:** 
  - VassalLord: Levy withholding, tax evasion, border raids, succession plots.
  - Spymaster: Counter-intelligence networks, claim fabrication, assassination cells.
  - HighPriest & CourtPriest: Papal interdicts, excommunication, heresy crusades.
  - MasterMerchant: Commodity monopolization, trade embargoes, supply chain manipulation.
  - MercenaryCaptain: Contract auctioneering, battlefield betrayal, pillaging rampages.
  - FolkHero & PeasantCohort: Jacqueries, food riots, populist rebellions.
  - BanditChief: Highway ambushes, protection rackets, settlement extortion.
  - ForeignRuler, HeirApparent, Chancellor, Marshal, Monk, and more.

### 3. Decoupled Multi-Threaded Engine Architecture
- **Dedicated Web Workers:** Heavy computation runs off-thread across SimulationWorker.ts, PathfindingWorker.ts, and BattleWorker.ts.
- **Tick Accumulator & Clock:** Real-time variable simulation speeds (1x, 2x, 5x, pause) running at an 800ms base tick rate with catch-up logic.
- **Differential Snapshot Streaming:** The simulation worker broadcasts state delta signatures to the client UI, maintaining 60 FPS rendering regardless of world complexity.

### 4. Deep Feudal Mechanics
- **Logistics & Supply Lines:** Army movement demands supply wagons and foraging lines. Troops isolated from supply hubs face rapid attrition, disease, and desertion.
- **Realistic Warfare & Sieges:** Army composition (Knights, Levies, Crossbows, Siege Engines), line-of-battle morale breaking, seasonal campaign windows, and fort starvation cycles.
- **Dynastic Lineage & Bloodlines:** Genetic and congenital trait inheritance, cadet branches, claims legitimacy, and strategic arranged marriages.
- **Dynamic Market Economies:** Multi-commodity supply/demand curves (grain, timber, iron, silk, salt, weapons) influenced by weather, blockades, and local trade treaties.

---

## 🛠️ Tech Stack & Systems

| Layer | Technologies |
| :--- | :--- |
| **Runtime & Framework** | [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/) |
| **State & Persistence** | [Zustand 5](https://github.com/pmndrs/zustand) (Modular slice architecture), [Dexie.js 4](https://dexie.com/) (IndexedDB saves), [nanoid](https://github.com/ai/nanoid) |
| **Concurrency & Workers** | Native [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) (SimulationWorker, PathfindingWorker, BattleWorker) |
| **UI & Styling** | [Tailwind CSS 4](https://tailwindcss.com/), [Motion 12](https://motion.dev/) (Framer Motion), [Lucide React](https://lucide.dev/) |
| **Cartography & Charts** | [MapLibre GL](https://maplibre.org/), [Recharts 3](https://recharts.org/) |
| **Audio Engine** | [Howler.js 2](https://howlerjs.com/) |
| **AI Integration** | [@google/genai](https://www.npmjs.com/package/@google/genai) (Autonomous chronicle generation & LLM diplomatic dialogue hooks) |

---

## 📂 Project Architecture

`
Soverereign-Grand-Strategy-Game/
├── src/
│   ├── core/                          # Pure deterministic simulation engine
│   │   ├── engine/                    # Engine clock, tick scheduler, seed & event bus
│   │   │   ├── GameLoop.ts            # Central simulation orchestrator
│   │   │   ├── TickScheduler.ts       # Sub-system interval tick dispatcher
│   │   │   ├── WorldClock.ts          # Calendrical tracking & seasonal transitions
│   │   │   ├── EventBus.ts            # Decoupled publish/subscribe bus
│   │   │   └── RandomSeed.ts          # Deterministic pseudo-random number generation
│   │   ├── environment/               # 4-Tier stochastic environmental simulation
│   │   │   ├── systems/
│   │   │   │   ├── Tier1ProvinceSystem.ts     # Local hex parameters & soil mechanics
│   │   │   │   ├── Tier2GeographicSystem.ts   # Rivers, mountains, fjords, volcanoes
│   │   │   │   ├── Tier3NetworkSystem.ts      # Caravans, maritime straits, biomes
│   │   │   │   ├── Tier4GlobalSystem.ts       # Continental climate & solar cycles
│   │   │   │   ├── FeedbackLoopSystem.ts      # Autonomous cross-tier emergent feedback
│   │   │   │   └── EnvironmentNPCBridge.ts    # Environmental pressure -> NPC behavior
│   │   │   ├── models/EnvironmentTypes.ts     # Complete environmental type definitions
│   │   │   └── data/                          # Initial geography & registry manifests
│   │   ├── systems/                   # Feudal domain simulation systems
│   │   │   ├── NpcAISystem.ts                 # Cognitive agent evaluator & decision matrix
│   │   │   ├── ActionWeightEngine.ts          # Probabilistic utility & weight evaluator
│   │   │   ├── NpcActionExecutor.ts           # Central action dispatcher & state mutator
│   │   │   ├── NpcMemorySystem.ts             # Memory record logging, decay & valence
│   │   │   ├── StateDriftSystem.ts            # Baseline continuous variable drift
│   │   │   ├── InterAgentInfluenceSystem.ts   # Social network & peer influence propagation
│   │   │   ├── NPCFeedbackLoopSystem.ts       # Long-tail behavioral feedback loops
│   │   │   ├── AureliaWorldSimulation.ts      # Macro-continental world seed & plates
│   │   │   ├── LogisticsSystem.ts             # Supply lines, baggage trains & forage
│   │   │   ├── EconomySystem.ts               # Commodity pricing, currency & trade
│   │   │   ├── MilitarySystem.ts              # Armies, battles, sieges, morale
│   │   │   ├── PoliticsSystem.ts              # Factions, plots, succession & laws
│   │   │   ├── DiplomacySystem.ts             # Treaties, alliances, truces & tributes
│   │   │   ├── DiseaseSystem.ts               # Pathogen reservoirs, epidemics, quarantine
│   │   │   ├── IntelligenceSystem.ts          # Spies, espionage networks & assassinations
│   │   │   ├── ReligionSystem.ts              # Faith doctrines, heresies & inquisitions
│   │   │   ├── WeatherSystem.ts               # Local precipitation, temperatures, storms
│   │   │   ├── PopulationSystem.ts            # Demographics, social strata & migration
│   │   │   └── executors/                     # Specialized archetype action executors
│   │   │       ├── AdvisorActionExecutor.ts
│   │   │       ├── FactionLeaderActionExecutor.ts
│   │   │       ├── FolkHeroActionExecutor.ts
│   │   │       ├── ForeignRulerActionExecutor.ts
│   │   │       ├── HeirApparentActionExecutor.ts
│   │   │       ├── HighPriestActionExecutor.ts
│   │   │       └── VassalActionExecutor.ts
│   │   ├── models/                    # Core domain entities
│   │   │   ├── Character.ts           # Stats, traits, kinship, titles, inventory
│   │   │   ├── NpcStateVector.ts      # Continuous, integer, categorical state vectors
│   │   │   ├── Province.ts            # Hex geometry, populace, holdings, garrison
│   │   │   ├── Army.ts                # Regiments, unit counts, supply state, morale
│   │   │   ├── Battle.ts              # Flanks, battle phases, tactics, sieges
│   │   │   ├── Dynasty.ts             # Family tree, prestige, cadet houses
│   │   │   ├── Faction.ts             # Conspiracies, civil wars, ultimatums
│   │   │   └── Treaty.ts              # Bilateral and multilateral pact agreements
│   │   ├── data/                      # Hardcoded lore, catalogs, and balances
│   │   │   ├── trait-definitions.ts   # 60+ personality, congenital & martial traits
│   │   │   ├── building-types.ts      # Holding upgrades (Castles, Guilds, Mills)
│   │   │   ├── technology-tree.ts     # Tech eras & military/economic discoveries
│   │   │   └── static-world.json      # Base historical province topology
│   │   └── factories/                 # Deterministic entity generators
│   └── workers/                       # Web Worker background threads
│       ├── SimulationWorker.ts        # Off-thread tick loop and snapshot broadcaster
│       ├── PathfindingWorker.ts       # A* terrain-weighted route calculation
│       └── BattleWorker.ts            # Tactical combat resolution sub-routine
├── consolidator.py                    # Developer codebase flattening utility
├── vite.config.ts                     # Build & dev server configuration
└── package.json                       # Dependencies & build scripts
`

---

## 🧠 Deep-Dive: NPC Cognitive State Model

Each NPC in the simulation maintains a three-part state vector ( = \langle C, I, K \rangle$):

### 1. Continuous State ( \in \mathbb{R}^{0..100}$)
Continuous variables represent internal psychological or physical states. In the absence of external stimuli, these continuously decay toward a character-specific genetic/cultural baseline:

\Delta C_i = \alpha_i \cdot (\text{baseline}_i - C_i)

| Variable | Description | High Threshold Behavior | Low Threshold Behavior |
| :--- | :--- | :--- | :--- |
| **mbition** | Desire for titles & supremacy | Plots against liege; seizes land | Content with vassalage |
| **paranoia** | Suspicion of peers & court | Executes suspected spies; isolates | Vulnerable to assassination |
| **piety** | Religious devotion | Donates to monasteries; joins holy wars | Susceptible to heresy |
| **stress** | Mental breakdown pressure | Severe health degradation; erratic choices | Clear tactical focus |
| **loyalty** | Fidelity to liege lord | Answers levy calls; refuses bribes | Open to conspiracy factions |
| **greed** | Thirst for coin & luxury | Imposes punitive taxes; debases coin | Donates to public works |

### 2. Integer State ( \in \mathbb{Z}$)
Raw numeric tallies updated discretely:
- 	reasury_gold: Available liquid capital.
- personal_levies: Feudal troops under direct command.
- avors_owed / avors_held: Feudal leverage currency.
- grudges_held: Unresolved grievances awaiting retribution.

### 3. Categorical State ($)
Discrete behavioral stances and roles:
- stance_to_liege: LOYAL | NEUTRAL | DISGRUNTLED | REBELLIOUS | TRAITOR
- ctive_plot: NONE | FABRICATE_CLAIM | EMBEZZLE | ASSASSINATE | SECEDE

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** (v9+) or **pnpm** / **yarn**

### Installation

1. **Clone the repository:**
   `ash
   git clone https://github.com/Gifted87/Soverereign-Grand-Strategy-Game.git
   cd Soverereign-Grand-Strategy-Game
   `

2. **Install dependencies:**
   `ash
   npm install
   `

3. **Configure Environment:**
   Copy the example environment configuration:
   `ash
   cp .env.example .env
   `
   *(Optional)* Add your Gemini API key to .env if enabling LLM-powered chronicle narratives:
   `env
   GEMINI_API_KEY=your_gemini_api_key_here
   `

4. **Launch Development Server:**
   `ash
   npm run dev
   `
   Open your browser and navigate to http://localhost:3000.

---

## 🎮 Game Loop & Developer Interface

### Available Scripts

| Command | Action |
| :--- | :--- |
| 
pm run dev | Starts the Vite dev server on http://0.0.0.0:3000 |
| 
pm run build | Compiles TypeScript and creates optimized production bundle in dist/ |
| 
pm run preview | Locally preview the production build |
| 
pm run lint | Runs type checks via 	sc --noEmit |
| 
pm run clean | Cleans build artifacts (m -rf dist server.js) |

### Interfacing with the Simulation Worker

You can communicate with the simulation engine via standard Web Worker messages:

`	ypescript
import SimulationWorker from './workers/SimulationWorker?worker';

const worker = new SimulationWorker();

// 1. Initialize a new simulation instance
worker.postMessage({
  type: 'INIT_CUSTOM_GAME',
  payload: {
    seed: 1337,
    startingYear: 1066,
    difficulty: 'REALISTIC'
  }
});

// 2. Control simulation playback
worker.postMessage({ type: 'SET_PAUSED', payload: false });
worker.postMessage({ type: 'SET_SPEED', payload: 2 }); // 1x, 2x, 5x

// 3. Dispatch player actions into the simulation
worker.postMessage({
  type: 'ACTION',
  payload: {
    type: 'DECLARE_WAR',
    targetRealmId: 'duchy_of_normandy',
    casusBelli: 'DE_JURE_CLAIM'
  }
});

// 4. Receive authoritative state deltas
worker.onmessage = (event) => {
  const { type, payload } = event.data;
  if (type === 'STATE_SNAPSHOT') {
    // Full world state snapshot
    console.log('Current Game Year:', payload.clock.year);
  } else if (type === 'DELTA_UPDATE') {
    // High-performance state delta patch
    applyStateDelta(payload);
  }
};
`

---

## 🗺️ Roadmap & Development Priorities

- [x] **Core Game Loop & Concurrency:** Worker-based decoupled simulation with tick accumulation.
- [x] **4-Tier Environmental Framework:** Multi-scale physical geography and autonomous feedback loops.
- [x] **Deep NPC State Engine:** 18 archetype action executors, continuous drift vectors, and episodic memory.
- [x] **Dynamic Economic Model:** Supply-demand price calculations, trade caravans, and infrastructure decay.
- [ ] **Interactive Canvas Map Viewport:** High-performance WebGL / MapLibre hex rendering with topological overlays.
- [ ] **Court Intrigues UI & Council Management:** Interactive council interface for appointment, bribery, and blackmail.
- [ ] **AI-Assisted Living Chronicle:** Real-time historical chronicle generation using @google/genai.

---

## 🤝 Contributing

Contributions to *Sovereign* are warmly welcomed! Whether you are improving tactical battle formulas, authoring new NPC archetypes, or expanding environmental feedback loops:

1. Fork the Project
2. Create your Feature Branch (git checkout -b feature/NewArchetype)
3. Commit your Changes (git commit -m 'feat: add mercenary guild contract betrayal mechanics')
4. Push to the Branch (git push origin feature/NewArchetype)
5. Open a Pull Request

---

## 📜 License

Distributed under the **MIT License**. See LICENSE for more information.

---

<p align=
