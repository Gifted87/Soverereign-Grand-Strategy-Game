import { useGameStore } from "../../store/gameStore";
import { MapOverlay } from "../../store/slices/uiSlice";
import { clsx } from "clsx";

export function MapOverlayControls() {
  const { activeMapOverlay, setMapOverlay } = useGameStore();

  const overlays: { id: MapOverlay; label: string }[] = [
    { id: "TERRAIN", label: "Terrain" },
    { id: "POLITICAL", label: "Realms" },
    { id: "ECONOMY", label: "Economy" },
    { id: "POPULATION", label: "Population" },
    { id: "MILITARY", label: "Military" },
    { id: "RELIGION", label: "Religion" },
    { id: "DISEASE", label: "Disease" },
    { id: "TRADE_ROUTES", label: "Trade" },
    { id: "FERTILITY", label: "Fertility" },
    { id: "ELEVATION", label: "Elevation" },
    { id: "PLATES", label: "Tectonic Plates" },
    { id: "CLIMATE", label: "Climate" }
  ];

  return (
    <div className="absolute top-14 left-4 z-40 p-2 bg-[#0c0d12]/90 backdrop-blur-md border border-[#3a352a]/60 rounded-md pointer-events-auto shadow-2xl max-w-sm font-sans">
      <div className="text-[9px] tracking-widest text-[#8a8470] font-sans font-extrabold uppercase mb-2 text-center border-b border-[#3a352a]/30 pb-1.5 select-none">
        Strategic Overlays
      </div>
      <div className="grid grid-cols-2 gap-1 w-48">
        {overlays.map((overlay) => (
          <button
            key={overlay.id}
            onClick={() => setMapOverlay(overlay.id)}
            className={clsx(
              "px-2 py-1 text-[8.5px] uppercase font-sans tracking-wide text-left transition-all cursor-pointer rounded-sm hover:scale-[1.02] duration-100",
              activeMapOverlay === overlay.id
                ? "bg-[#3a352a]/80 text-[#c2a461] font-semibold border-l-2 border-[#c2a461] shadow-inner"
                : "text-stone-light hover:text-[#e8e2d2] border-l-2 border-transparent hover:bg-[#322f25]/50"
            )}
          >
            {overlay.label}
          </button>
        ))}
      </div>
    </div>
  );
}
export default MapOverlayControls;
