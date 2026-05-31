import { useGameStore } from "../store/gameStore";
import React, { useEffect, useRef, useState } from "react";
import { hexCorners, hexToPixel } from "../utils/geo";
import { Province } from "../core/models/Province";
import { MapOverlay } from "../store/slices/uiSlice";
import { MapOverlayControls } from "./map/MapOverlayControls";

const HEX_SIZE = 100;

// Generate beautiful high-fidelity medieval color palette according to active overlays
function getOverlayColor(prov: Province, activeMapOverlay: MapOverlay): string {
  switch (activeMapOverlay) {
    case "TERRAIN": {
      if (prov.terrain === "PLAINS") return "#2c3b24"; // Rich medieval grass green
      if (prov.terrain === "COAST") return "#162a34"; // Navy tide waters
      if (prov.terrain === "MOUNTAINS") return "#393530"; // Granite slate mountains
      if (prov.terrain === "HILLS") return "#4d3e2d"; // Warm wood hills
      if (prov.terrain === "DEEP_FOREST") return "#12261a"; // Forest green
      return "#212822";
    }
    case "POLITICAL": {
      const realmId = prov.realmId || prov.ownerId || "unaligned";
      let hash = 0;
      for (let i = 0; i < realmId.length; i++) {
        hash = realmId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const MEDIEVAL_REALM_COLORS = [
        "#5a1210", // Burgundy heraldry crimson
        "#112340", // Royal navy blue
        "#143b1a", // Deep emerald forest
        "#8c631b", // Muted imperial gold
        "#32123d", // Noble crown purple
        "#11343b", // Deep sovereign teal
        "#4a1930", // Royal plum
        "#3b4214", // Sovereign bronze
        "#0c2533", // Ironclad grey
        "rgba(217, 169, 87, 0.4)" // Gold veins
      ];
      const colorIndex = Math.abs(hash) % MEDIEVAL_REALM_COLORS.length;
      return MEDIEVAL_REALM_COLORS[colorIndex];
    }
    case "ECONOMY": {
      const richness = (prov.resources || []).reduce((sum, res) => sum + (res.richness || 0), 0);
      const serfCount = prov.population?.serfs || 0;
      const score = Math.min(250, richness + serfCount * 0.015);
      
      if (score > 180) return "rgba(217, 169, 87, 0.7)"; // Gold rich veins
      if (score > 120) return "rgba(110, 184, 138, 0.6)"; // High prosperity green
      if (score > 60) return "#2c4a35"; // Normal trade green
      return "#382e22"; // Impoverished mud clay
    }
    case "POPULATION": {
      const pop = prov.population?.total || 0;
      if (pop > 35000) return "#7c1c1c"; // Crimson urban hub
      if (pop > 20000) return "#9a5e1c"; // Amber prosperous valley
      if (pop > 8000) return "#5c401c"; // Muted brown townland
      return "#2a2824"; // Wilderness outposts
    }
    case "MILITARY": {
      const fort = prov.fortificationLevel || 0;
      const isBesieged = prov.isBesieged ? 1 : 0;
      
      if (isBesieged) return "#800c0c"; // Active red alerts
      if (fort >= 3) return "#1e3a8a"; // Bastion blue
      if (fort >= 1) return "#2563eb"; // Wooden keep blue
      return "#24211d"; // Rural peasant holdings
    }
    case "RELIGION": {
      const baseHash = (prov.id.charCodeAt(prov.id.length - 1) || 0) % 3;
      if (baseHash === 0) return "#5c0e20"; // Orthodoxy crimson
      if (baseHash === 1) return "#0f285c"; // Holy sapphire
      return "#185c2c"; // Ancient woods creed
    }
    case "DISEASE": {
      if (prov.disease) {
        const severity = prov.disease.severity || 10;
        if (prov.disease.diseaseId === "PLAGUE") {
          return severity > 50 ? "#580f70" : "#3b0a4d"; // Toxic violet plaguemist
        }
        return severity > 50 ? "#7b1010" : "#500a0a"; // Epidemic red
      }
      return "#1e2216"; // Sterile healthy pastures
    }
    case "TRADE_ROUTES": {
      const road = prov.roadQuality || 0;
      if (road > 70) return "#b45309"; // Caravan highway amber
      if (road > 40) return "#78350f"; // Trading dirt tracks
      return "#211d1a"; // Wilderness untamed
    }
    case "FERTILITY": {
      const fert = prov.fertility || 0;
      if (prov.salted) return "#4b5563"; // Salted ruins grey
      if (fert > 80) return "#064e3b"; // Yield-rich crops emerald
      if (fert > 50) return "#14532d"; // Stable plains green
      if (fert > 20) return "#451a03"; // Arid barrens brown
      return "#271c19"; // Dead peatlands
    }
    case "ELEVATION": {
      const elev = prov.elevation || 0;
      if (elev > 750) return "#f1f5f9"; // Alpine peaks white
      if (elev > 500) return "#64748b"; // Rocky heights slate
      if (elev > 250) return "#451a03"; // Shady foothills
      return "#13232c"; // Delta lowlands
    }
    case "PLATES": {
      if (prov.id.startsWith("prov_v")) {
        return (prov.coords.q || 0) > 8 ? "#115e59" : "#0f766e";
      } else if (prov.id.startsWith("prov_n")) {
        return (prov.coords.r || 0) > 8 ? "#4c1d95" : "#0369a1";
      } else {
        const q = prov.coords.q || 0;
        const r = prov.coords.r || 0;
        if (q < 0 && r < 0) return "#475569";
        if (q >= 0 && r < 0) return "#991b1b";
        if (q < 0 && r >= 0) return "#ea580c";
        return "#1e3a8a";
      }
    }
    case "CLIMATE": {
      const elev = prov.elevation || 0;
      const fert = prov.fertility || 0;
      if (elev > 600) return "#e2e8f0";
      if (elev > 400) return "#475569";
      if (fert > 80) return "#065f46";
      if (fert > 50) return "#15803d";
      if (fert > 20) return "#a16207";
      return "#78350f";
    }
    default:
      return "rgba(217, 169, 87, 0.05)";
  }
}

// secondary labels on the map hexagons matching overlays
function getSecondaryLabel(prov: Province, activeMapOverlay: MapOverlay, dynasties?: any, characters?: any): string {
  switch (activeMapOverlay) {
    case "TERRAIN": {
      const formatTerrain = prov.terrain.toLowerCase().replace("_", " ");
      return formatTerrain.charAt(0).toUpperCase() + formatTerrain.slice(1);
    }
    case "POLITICAL": {
      const owner = characters?.[prov.ownerId];
      if (owner) {
        const dyn = dynasties?.[owner.dynastyId];
        if (dyn) return `House ${dyn.name}`;
        return `${owner.firstName} ${owner.lastName}`;
      }
      if (prov.realmId === 'realm_1' || prov.ownerId === 'player') return 'House Valedor';
      if (prov.realmId === 'realm_2' || prov.ownerId === 'enemy_lord') return 'House Valerius';
      return prov.realmId ? `Realm: ${prov.realmId.replace("realm_", "Region ")}` : "Unaligned";
    }
    case "ECONOMY": {
      const resName = prov.resources?.[0]?.good || "None";
      const formatted = resName.replace("_", " ").toLowerCase();
      const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      return `Good: ${capitalized}`;
    }
    case "POPULATION":
      return `Pop: ${(prov.population?.total || 0).toLocaleString()}`;
    case "MILITARY":
      return `Keep Lvl: ${prov.fortificationLevel}`;
    case "RELIGION":
      return `Orthodoxy`;
    case "DISEASE":
      return prov.disease ? `${prov.disease.diseaseId}: ${prov.disease.severity}%` : "No Disease";
    case "TRADE_ROUTES":
      return `Roads: ${prov.roadQuality}%`;
    case "FERTILITY":
      return `Soil: ${prov.fertility}%`;
    case "ELEVATION":
      return `Altitude: ${prov.elevation}m`;
    case "PLATES": {
      if (prov.id.startsWith("prov_v")) {
        return (prov.coords.q || 0) > 8 ? "Plate: Kareth" : "Plate: Vareth";
      } else if (prov.id.startsWith("prov_n")) {
        return (prov.coords.r || 0) > 8 ? "Plate: Orun" : "Plate: Sapphire";
      } else {
        const q = prov.coords.q || 0;
        const r = prov.coords.r || 0;
        if (q < 0 && r < 0) return "Plate: Glacial Craton";
        if (q >= 0 && r < 0) return "Plate: Mtn Convergent";
        if (q < 0 && r >= 0) return "Plate: Volcanic Plate";
        return "Plate: Spreading Rift";
      }
    }
    case "CLIMATE": {
      const elev = prov.elevation || 0;
      const fert = prov.fertility || 0;
      if (elev > 600) return "Climate: Frost Tundra";
      if (elev > 400) return "Climate: Pine Highlands";
      if (fert > 80) return "Climate: Lush Wetlands";
      if (fert > 50) return "Climate: Damp Temperate";
      if (fert > 20) return "Climate: Arid Steppes";
      return "Climate: Desert Salt";
    }
    default:
      return "";
  }
}

const CONTINENTS_DATA = [
  { id: 'aurelia', name: 'Aurelia', desc: 'The Hearthland Basin. Fertile plains, valleys, and riverways.', active: true, q: 0, r: 0 },
  { id: 'vareth', name: 'Vareth', desc: 'The Fractured Continent. Towering peaks, isolated valleys, and grasslands.', active: true, q: 8, r: -8, detail: 'A continent sitting on three colliding tectonic plates, featuring the Skywall Mountains, the Mirror Sea, and the nomad-ruled Endless Steppes.' },
  { id: 'nythara', name: 'Nythara', desc: 'The Ocean Continent. Fusion of three landmasses with complex gulfs and ports.', active: true, q: -8, r: 8, detail: 'Once distinct, millions of years of plate drift fused Nythara. Possesses a massive 6,000 km Sapphire Coastline, the great Orun River system, dense Emerald rainforests, and resource-heavy plateaus.' }
];

export function MapCanvas() {
  const { provinces, armies, selectedProvinceId, selectProvince, activeMapOverlay, dynasties, characters } = useGameStore() as any;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Map Navigation & Interaction State variables
  const [zoom, setZoom] = useState(1.1);
  const [pan, setPan] = useState({ x: 0, y: -20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Dropdown navigation state
  const [worldDropdownOpen, setWorldDropdownOpen] = useState(false);
  const [selectedWorldContName, setSelectedWorldContName] = useState("Aurelia");

  // Floating hover tracking
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  const [hoverMousePos, setHoverMousePos] = useState({ x: 0, y: 0 });

  // Distant continent selector details
  const [selectedDistantContinent, setSelectedDistantContinent] = useState<any | null>(null);

  const jumpToContinent = (q: number, r: number) => {
    const center = hexToPixel({ q, r, s: -q-r }, HEX_SIZE);
    const z = 1.1;
    setZoom(z);
    setPan({
      x: -center.x * z,
      y: -center.y * z - 20
    });
  };

  // Reset panning & zoom back to cinematic initial coordinates
  const handleResetView = () => {
    setZoom(1.1);
    setPan({ x: 0, y: -20 });
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(3.0, z * 1.15));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.4, z / 1.15));
  };

  // Convert client cursor screen position on canvas to custom map coordinates offsets
  const getMouseWorldCoordinates = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const worldX = (screenX - rect.width / 2 - pan.x) / zoom;
    const worldY = (screenY - rect.height / 2 - pan.y) / zoom;

    return { worldX, worldY };
  };

  // 1. Zoom via mouse scroll wheel smoothly
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.max(0.4, Math.min(nextZoom, 3.0)));
  };

  // 2. Click & drag panning actions start
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Ignore right and middle clicks
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // 3. Move camera position and recalculate hover highlights
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    const { worldX, worldY } = getMouseWorldCoordinates(canvas, e.clientX, e.clientY);

    let closestProvId: string | null = null;
    let minDistance = Infinity;

    (Object.values(provinces) as any[]).forEach((prov) => {
      const center = hexToPixel(prov.coords, HEX_SIZE);
      const dx = worldX - center.x;
      const dy = worldY - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        closestProvId = prov.id;
      }
    });

    if (minDistance < HEX_SIZE * 1.05) {
      setHoveredProvinceId(closestProvId);
      setHoverMousePos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredProvinceId(null);
    }
  };

  // 4. Click triggers selection if panning delta didn't move too far away
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaX = e.clientX - (dragStart.x + pan.x);
    const deltaY = e.clientY - (dragStart.y + pan.y);
    const dragDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (dragDelta < 6) {
      const canvas = e.currentTarget;
      const { worldX, worldY } = getMouseWorldCoordinates(canvas, e.clientX, e.clientY);

      let closestProvId: string | null = null;
      let minDistance = Infinity;

      (Object.values(provinces) as any[]).forEach((prov) => {
        const center = hexToPixel(prov.coords, HEX_SIZE);
        const dx = worldX - center.x;
        const dy = worldY - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          minDistance = dist;
          closestProvId = prov.id;
        }
      });

      if (minDistance < HEX_SIZE * 1.05) {
        selectProvince(closestProvId);
      } else {
        selectProvince(null);
      }
    }
  };

  // Focus effect: smoothly pan towards any selected province if selected outside are mapped
  useEffect(() => {
    if (selectedProvinceId) {
      const selectedProv = provinces[selectedProvinceId];
      if (selectedProv) {
        const center = hexToPixel(selectedProv.coords, HEX_SIZE);
        // Pan so center of selected province is focused beautifully
        setPan({
          x: -center.x * zoom,
          y: -center.y * zoom - 20
        });
      }
    }
  }, [selectedProvinceId]);

  // Main high fidelity rendering cycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const renderLoop = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const devicePixelRatio = window.devicePixelRatio || 1;
      const w = parent.clientWidth || 800;
      const h = parent.clientHeight || 500;

      // Adjust for High-DPI screen scaling to secure extremely sharp vector results
      if (canvas.width !== w * devicePixelRatio || canvas.height !== h * devicePixelRatio) {
        canvas.width = w * devicePixelRatio;
        canvas.height = h * devicePixelRatio;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, w, h);

      // A. DRAW MAP PARCHMENT CANVAS BACKING (Vivid radial gradient)
      const radGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h));
      radGrad.addColorStop(0, "#191714"); // Warm leather amber black
      radGrad.addColorStop(0.65, "#0f0e0c"); // Heavy charcoal vignette
      radGrad.addColorStop(1, "#070605"); // Edge shadows
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);

      // B. COMPASS ROSE RHUMB LINES (Authentic classical navigation lattice)
      const compassX = w - 110;
      const compassY = h - 110;
      ctx.strokeStyle = "rgba(217, 169, 87, 0.03)";
      ctx.lineWidth = 0.6;
      for (let angle = 0; angle < 360; angle += 15) {
        const rad = (angle * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(compassX, compassY);
        ctx.lineTo(compassX + Math.cos(rad) * 2000, compassY + Math.sin(rad) * 2000);
        ctx.stroke();
      }

      // C. LAT/LON GRID (Beige coordinates reference matrix)
      ctx.strokeStyle = "rgba(122, 110, 102, 0.08)";
      ctx.setLineDash([4, 12]);
      ctx.lineWidth = 0.7;
      for (let x = -1000; x < 1500; x += 250) {
        const screenX = w / 2 + pan.x + x * zoom;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, h);
        ctx.stroke();
      }
      for (let y = -1000; y < 1500; y += 250) {
        const screenY = h / 2 + pan.y + y * zoom;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(w, screenY);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Restorative defaults

      // D. APPLY CAMERA COORDINATES OFFSET
      ctx.save();
      ctx.translate(w / 2 + pan.x, h / 2 + pan.y);
      ctx.scale(zoom, zoom);

      // E. DRAW Winding Rivers & Roads (dynamically based on province roads metadata and terrain)
      ctx.save();
      ctx.restore();

      // G. DRAW CONCENTRIC COASTLINE SHORELINE RIPPLES around Coast hexagons
      (Object.values(provinces) as any[]).forEach((prov) => {
        const center = hexToPixel(prov.coords, HEX_SIZE);
        if (prov.terrain === "COAST") {
          for (let ro = 1.05; ro < 1.35; ro += 0.08) {
            const rip = hexCorners(center, HEX_SIZE * ro);
            ctx.beginPath();
            ctx.moveTo(rip[0].x, rip[0].y);
            for (let i = 1; i < 6; i++) {
              ctx.lineTo(rip[i].x, rip[i].y);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(29, 60, 69, ${0.42 - (ro - 1.05) * 1.5})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      });

      // H. DRAW SEA SERPENT (Classical mythological monster sketch)
      ctx.save();
      ctx.translate(250, -210);
      ctx.strokeStyle = "rgba(122, 110, 102, 0.38)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-20, 0, 16, Math.PI, 0, false);
      ctx.arc(12, 0, 16, Math.PI, 0, true);
      ctx.arc(44, 0, 13, Math.PI * 1.1, 0, false);
      ctx.stroke();

      // Sharp head
      ctx.beginPath();
      ctx.moveTo(-36, 11);
      ctx.quadraticCurveTo(-46, 0, -32, -9);
      ctx.lineTo(-27, -2);
      ctx.stroke();

      // Serpent eye
      ctx.fillStyle = "rgba(122, 110, 102, 0.6)";
      ctx.beginPath();
      ctx.arc(-34, -2, 1.2, 0, 2 * Math.PI);
      ctx.fill();

      // Serpent Warning label
      ctx.fillStyle = "rgba(122, 110, 102, 0.45)";
      ctx.font = "italic 7.5px Lora, serif";
      ctx.fillText("Hic Sunt Dracones", -50, 25);
      ctx.restore();

      // I. DRAW VINTAGE SAILING CARAVEL SHIP
      ctx.save();
      ctx.translate(-250, -170);
      ctx.strokeStyle = "rgba(122, 110, 102, 0.32)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-16, 5);
      ctx.lineTo(21, 5);
      ctx.quadraticCurveTo(29, -5, 24, -9);
      ctx.lineTo(14, -9);
      ctx.lineTo(14, -2);
      ctx.lineTo(-13, -2);
      ctx.lineTo(-18, -9);
      ctx.closePath();
      ctx.stroke();
      
      // rigging
      ctx.beginPath();
      ctx.moveTo(3, -2); ctx.lineTo(3, -25);
      ctx.moveTo(-10, -2); ctx.lineTo(-10, -19);
      ctx.moveTo(3, -4); ctx.quadraticCurveTo(15, -12, 3, -22);
      ctx.moveTo(-10, -4); ctx.quadraticCurveTo(-2, -11, -10, -17);
      ctx.stroke();
      ctx.restore();

      // J. DRAW PROVINCES COOP LAYERS & CORNER BOUNDS
      (Object.values(provinces) as any[]).forEach((prov: any) => {
        const center = hexToPixel(prov.coords, HEX_SIZE);
        const corners = hexCorners(center, HEX_SIZE * 0.95);
        const isSelected = prov.id === selectedProvinceId;
        const isHovered = prov.id === hoveredProvinceId;

        // Overlay colors
        const color = getOverlayColor(prov, activeMapOverlay);

        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) {
          ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.globalAlpha = isSelected ? 0.76 : isHovered ? 0.62 : 0.42;
        ctx.fill();

        // Stroke contours
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = isSelected 
          ? "#D9A957" // glowing gold outline
          : isHovered 
            ? "rgba(217, 169, 87, 0.5)" 
            : "rgba(122, 110, 102, 0.28)";
        ctx.lineWidth = isSelected ? 3.0 : isHovered ? 1.8 : 1.1;
        ctx.stroke();

        // Draw individual handcraft terrain overlays
        ctx.save();
        ctx.translate(center.x, center.y);

        // Hex clip lock
        ctx.beginPath();
        const rawGrid = hexCorners({ x: 0, y: 0 }, HEX_SIZE * 0.9);
        ctx.moveTo(rawGrid[0].x, rawGrid[0].y);
        for (let i = 1; i < 6; i++) {
          ctx.lineTo(rawGrid[i].x, rawGrid[i].y);
        }
        ctx.closePath();
        ctx.clip();

        if (prov.terrain === "MOUNTAINS") {
          const makePeak = (px: number, py: number, sc: number) => {
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(sc, sc);

            // Light slope facet (Left)
            ctx.strokeStyle = "rgba(232, 226, 210, 0.42)";
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(0, -22);
            ctx.lineTo(-18, 12);
            ctx.lineTo(0, 12);
            ctx.closePath();
            ctx.stroke();

            // Dark shading facet (Right)
            ctx.fillStyle = "rgba(12, 10, 9, 0.32)";
            ctx.beginPath();
            ctx.moveTo(0, -22);
            ctx.lineTo(18, 12);
            ctx.lineTo(0, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Center ridge lines
            ctx.beginPath();
            ctx.moveTo(0, -22);
            ctx.lineTo(-2, 12);
            ctx.stroke();

            // Slosh shading hatches
            ctx.strokeStyle = "rgba(122, 110, 102, 0.35)";
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            for (let hy = -10; hy < 12; hy += 4) {
              const startX = 0;
              const endX = ((hy + 10)/22) * 16;
              ctx.moveTo(startX, hy);
              ctx.lineTo(endX, hy + 2.5);
            }
            ctx.stroke();
            ctx.restore();
          };

          makePeak(0, -10, 1.15);
          makePeak(-28, 15, 0.8);
          makePeak(28, 15, 0.8);
        }

        else if (prov.terrain === "HILLS") {
          const makeHill = (hx: number, hy: number, hw: number, hh: number) => {
            ctx.strokeStyle = "rgba(232, 226, 210, 0.32)";
            ctx.fillStyle = "rgba(12, 10, 9, 0.22)";
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(hx - hw, hy);
            ctx.quadraticCurveTo(hx, hy - hh * 1.5, hx + hw, hy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Small grass lines
            ctx.strokeStyle = "rgba(122, 110, 102, 0.32)";
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            for (let xo = 3; xo < hw; xo += 4) {
              ctx.moveTo(hx + xo, hy - hh * 0.1);
              ctx.lineTo(hx + xo + 1.5, hy);
            }
            ctx.stroke();
          };

          makeHill(-16, 12, 28, 18);
          makeHill(18, 18, 25, 14);
          makeHill(-5, -15, 25, 18);
        }

        else if (prov.terrain === "DEEP_FOREST") {
          const makeTree = (tx: number, ty: number, sc: number) => {
            ctx.save();
            ctx.translate(tx, ty);
            ctx.scale(sc, sc);

            // small timber trunk
            ctx.strokeStyle = "rgba(122, 110, 102, 0.65)";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 11);
            ctx.stroke();

            // foliage
            ctx.strokeStyle = "rgba(110, 184, 138, 0.4)";
            ctx.fillStyle = "rgba(18, 38, 26, 0.82)";
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.arc(0, -2, 9, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, -7, 7, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
          };

          makeTree(-24, 10, 0.95);
          makeTree(0, -12, 1.15);
          makeTree(24, 12, 0.9);
          makeTree(-10, 24, 0.8);
          makeTree(12, 22, 0.85);
        }

        else if (prov.terrain === "PLAINS") {
          // Crop field lines
          ctx.strokeStyle = "rgba(217, 169, 87, 0.15)";
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          for (let d = -25; d <= 25; d += 8) {
            ctx.moveTo(d - 12, -20);
            ctx.lineTo(d + 12, 20);
          }
          ctx.stroke();

          // Rotating windmill
          ctx.save();
          ctx.translate(10, -8);
          ctx.strokeStyle = "rgba(232, 226, 210, 0.42)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-5, 18);
          ctx.lineTo(-3, 0);
          ctx.lineTo(3, 0);
          ctx.lineTo(5, 18);
          ctx.closePath();
          ctx.stroke();
          
          const spin = (Date.now() / 1400) % (Math.PI * 2);
          ctx.save();
          ctx.translate(0, 0);
          ctx.rotate(spin);
          ctx.strokeStyle = "#c2a461";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const rot = (i * Math.PI) / 2;
            const rx = Math.cos(rot);
            const ry = Math.sin(rot);
            ctx.moveTo(0, 0);
            ctx.lineTo(rx * 16, ry * 16);
            ctx.rect(rx * 5 - (ry * 2), ry * 5 + (rx * 2), rx * 9, ry * 1.8);
          }
          ctx.stroke();
          ctx.restore();
          ctx.restore();
        }

        else if (prov.terrain === "COAST") {
          ctx.strokeStyle = "rgba(37, 72, 89, 0.38)";
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(-35, -4); ctx.quadraticCurveTo(-30, -9, -25, -4);
          ctx.moveTo(-25, -4); ctx.quadraticCurveTo(-20, -9, -15, -4);
          ctx.moveTo(15, 12); ctx.quadraticCurveTo(20, 7, 25, 12);
          ctx.moveTo(25, 12); ctx.quadraticCurveTo(30, 7, 35, 12);
          ctx.stroke();

          // Port wood dock jetty
          ctx.strokeStyle = "rgba(232, 226, 210, 0.45)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-8, -14);
          ctx.lineTo(6, -4);
          ctx.lineTo(14, -18);
          ctx.stroke();
        }

        ctx.restore();

        // Citadel icon overlays
        if (prov.id === "prov_4" || (prov.fortificationLevel && prov.fortificationLevel >= 2)) {
          ctx.save();
          ctx.translate(center.x, center.y - 28);
          ctx.strokeStyle = "rgba(217, 169, 87, 0.85)";
          ctx.fillStyle = "#0c0b09";
          ctx.lineWidth = 1.3;

          ctx.beginPath();
          ctx.rect(-9, -4, 18, 17);
          ctx.rect(-17, -9, 8, 22);
          ctx.rect(9, -9, 8, 22);
          ctx.fill();
          ctx.stroke();

          // gatehouse
          ctx.beginPath();
          ctx.rect(-4, 4, 8, 8);
          ctx.stroke();

          // flagpole
          ctx.strokeStyle = "#C4616A"; // red banners
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.lineTo(0, -16);
          ctx.lineTo(9, -12);
          ctx.lineTo(0, -8);
          ctx.stroke();
          ctx.restore();
        }
      });

      // K. DRAW MILITARY DEPLOYED HERALDRY BANNERS
      (Object.values(armies) as any[]).forEach((army) => {
        const matchingProv = (Object.values(provinces) as any[]).find(
          (p) => p.coords.q === army.location.q && p.coords.r === army.location.r
        );
        if (!matchingProv) return;

        const center = hexToPixel(matchingProv.coords, HEX_SIZE);
        const armyY = center.y + 24;

        ctx.save();
        ctx.translate(center.x, armyY);

        const totalMen = army.units?.reduce((sum, u) => sum + (u.count || 0), 0) || 0;

        let bannerColor = "#8a1c14"; // Default burgundy/hostile
        let icon = "🛡️";
        if (army.stance === "MARCH") { bannerColor = "#15305b"; icon = "🐎"; }
        else if (army.stance === "DEFEND") { bannerColor = "#1a4a1f"; icon = "🏰"; }
        else if (army.stance === "RAID") { bannerColor = "#78470a"; icon = "🔥"; }
        else if (army.stance === "BESIEGE") { bannerColor = "#411450"; icon = "☄️"; }

        ctx.fillStyle = bannerColor;
        ctx.strokeStyle = "#c2a461";
        ctx.lineWidth = 1.0;

        // Medieval banner standard geometry
        ctx.beginPath();
        ctx.moveTo(-28, -7);
        ctx.lineTo(28, -7);
        ctx.lineTo(28, 12);
        ctx.lineTo(0, 5); // swallowtail split
        ctx.lineTo(-28, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(122, 110, 102, 0.9)";
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(-31, -10); ctx.lineTo(31, -10);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 6.5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${icon} ${army.name.toUpperCase()}`, 0, 0);

        ctx.fillStyle = "rgba(255, 235, 200, 0.9)";
        ctx.font = "bold 6.5px 'Share Tech Mono', monospace";
        ctx.fillText(`${totalMen.toLocaleString()}`, 0, 7);

        ctx.restore();
      });

      // L. NAME SIGNPLATES WITH INTEGRATED OVERLAY INFO (REAL DATA VALUES)
      (Object.values(provinces) as any[]).forEach((prov) => {
        const center = hexToPixel(prov.coords, HEX_SIZE);
        const isSelected = prov.id === selectedProvinceId;
        const isHovered = prov.id === hoveredProvinceId;

        ctx.save();
        ctx.translate(center.x, center.y);

        // Get actual data overlay information
        const overlayText = getSecondaryLabel(prov, activeMapOverlay, dynasties, characters);

        ctx.font = isSelected ? "bold 7px Lora, serif" : "7px Lora, serif";
        const nameWidthCalculated = ctx.measureText(prov.name).width;
        
        ctx.font = "bold 6px 'Share Tech Mono', monospace";
        const overlayWidthCalculated = overlayText ? ctx.measureText(overlayText).width : 0;

        const nameWidth = Math.max(nameWidthCalculated, overlayWidthCalculated) + 16;
        
        // Make placard taller if overlay data is present
        const placardHeight = overlayText ? 23 : 14;
        const placardY = overlayText ? -41 : -37;

        ctx.fillStyle = isSelected 
          ? "rgba(18, 16, 14, 0.98)" 
          : isHovered 
            ? "rgba(10, 9, 8, 0.92)" 
            : "rgba(12, 11, 10, 0.85)";

        ctx.strokeStyle = isSelected ? "#D9A957" : "rgba(122, 110, 102, 0.45)";
        ctx.lineWidth = isSelected ? 1.5 : 0.8;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-nameWidth / 2, placardY, nameWidth, placardHeight, 2.5);
        } else {
          ctx.rect(-nameWidth / 2, placardY, nameWidth, placardHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Title row: Province Name
        ctx.fillStyle = isSelected ? "#ffffff" : "#e8e2d2";
        ctx.font = isSelected ? "bold 7px Lora, serif" : "7px Lora, serif";
        ctx.textAlign = "center";
        ctx.fillText(prov.name, 0, placardY + 9);

        // Subtitle row: Overlay dynamic data
        if (overlayText) {
          ctx.fillStyle = isSelected ? "#F39C12" : "#D9A957";
          ctx.font = "bold 6px 'Share Tech Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(overlayText, 0, placardY + 18);
        }

        // Good type emblem indicator (moved down slightly if overlayText is rendered)
        const primeGood = prov.resources?.[0]?.good || "";
        let goodEmblem = "🌾";
        if (primeGood === "TIMBER") goodEmblem = "🌲";
        else if (primeGood === "FISH") goodEmblem = "🐟";
        else if (primeGood === "IRON_ORE") goodEmblem = "⛏️";
        else if (primeGood === "STONE") goodEmblem = "🧱";

        ctx.fillStyle = "#8a8470";
        ctx.font = "7.5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(goodEmblem, 0, overlayText ? -14 : -18);

        ctx.restore();
      });

      ctx.restore(); // Restore world positioning transformations

      // M. COMPASS ROSE DECORATIVE EMBLEM (Fixed top layer!)
      ctx.save();
      ctx.translate(compassX, compassY);
      
      ctx.strokeStyle = "rgba(217, 169, 87, 0.42)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.strokeStyle = "rgba(217, 169, 87, 0.12)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.strokeStyle = "rgba(217, 169, 87, 0.25)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-50, 0); ctx.lineTo(50, 0);
      ctx.moveTo(0, -50); ctx.lineTo(0, 50);
      ctx.stroke();

      const drawCompassStar = (angleDeg: number, len: number) => {
        ctx.save();
        ctx.rotate((angleDeg * Math.PI) / 180);
        
        ctx.fillStyle = "rgba(217, 169, 87, 0.6)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(4, -5);
        ctx.lineTo(0, -len);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(217, 169, 87, 0.72)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-4, -5);
        ctx.lineTo(0, -len);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
      };

      drawCompassStar(0, 36);
      drawCompassStar(90, 36);
      drawCompassStar(180, 36);
      drawCompassStar(270, 36);

      drawCompassStar(45, 23);
      drawCompassStar(135, 23);
      drawCompassStar(225, 23);
      drawCompassStar(315, 23);

      ctx.fillStyle = "rgba(217, 169, 87, 0.82)";
      ctx.font = "bold 9px Lora, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", 0, -48);
      ctx.fillText("S", 0, 48);
      ctx.fillText("E", 48, 0);
      ctx.fillText("W", -48, 0);

      ctx.restore();

      // N. MEDIEVAL TITLE CARTOUCHE
      ctx.save();
      ctx.translate(35, 75);
      
      ctx.fillStyle = "rgba(16, 14, 12, 0.84)";
      ctx.strokeStyle = "#3a352a";
      ctx.lineWidth = 1.0;
      
      const cartW = 185;
      const cartH = 50;
      
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(0, 0, cartW, cartH, 3);
      } else {
        ctx.rect(0, 0, cartW, cartH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#D9A957";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(4, 4, cartW - 8, cartH - 8, 1);
      } else {
        ctx.rect(4, 4, cartW - 8, cartH - 8);
      }
      ctx.stroke();

      ctx.fillStyle = "#F5AD8C";
      ctx.font = "bold 9.5px Lora, serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Tri-Continental Ecumene", 12, 10);

      ctx.fillStyle = "rgba(245, 173, 140, 0.55)";
      ctx.font = "italic 7.5px Lora, serif";
      ctx.fillText("Plotted Survey • Year of Our Lord 1142", 12, 22);

      ctx.fillStyle = "#7A6E66";
      ctx.font = "500 7px 'Share Tech Mono', monospace";
      ctx.fillText("SCALE 3.2M • GLOBAL RECORDS", 12, 33);
      ctx.restore();

      ctx.restore(); // Restore devicePixelRatio matrix
      animId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animId);
  }, [provinces, armies, activeMapOverlay, selectedProvinceId, hoveredProvinceId, zoom, pan]);

  // Read hovered province metadata details safely from game states
  const hoveredProvince = hoveredProvinceId ? provinces[hoveredProvinceId] : null;

  return (
    <div className="flex-1 overflow-hidden relative flex flex-col min-h-[500px]" style={{ height: "100%" }}>
      {/* Dynamic star cluster coordinate background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: "radial-gradient(#3a352a 1px, transparent 0)", backgroundSize: "32px 32px" }}
      />
      
      <div className="relative h-full w-full border border-stone/30 bg-[#0c0a08] flex flex-col shadow-2xl rounded-lg overflow-hidden flex-1">
        {/* Cinematic Header with navigation status lines */}
        <div className="h-10 border-b border-[#3a352a]/40 flex items-center px-4 bg-[#0e0c0a] justify-between shrink-0 z-10 font-sans">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#D9A957] rounded-full animate-pulse" />
            <span className="text-[10px] tracking-widest text-[#8a8470] uppercase font-bold">
              SURVEYOR'S MAP: TRI-CONTINENTAL INTERCONNECTION PROJECTION
            </span>
          </div>
          <div className="flex gap-4 text-[9.5px] items-center">
            <button 
              className="text-[#c2a461]/80 hover:text-white cursor-pointer select-none transition-colors border border-[#3a352a]/50 px-2 py-0.5 rounded-sm bg-[#161412]/80 font-bold"
              onClick={handleResetView}
            >
              🧭 CENTER VIEW
            </button>
            <span className="text-[#7a6e66] font-mono">
              ZOOM: {Math.floor(zoom * 100)}%
            </span>
          </div>
        </div>
        
        {/* Map Workspace */}
        <div className="flex-1 relative w-full h-full min-h-[400px]">
          <canvas 
            ref={canvasRef} 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" 
          />

          {/* Interactive overlays floating */}
          <MapOverlayControls />

          {/* Active Continent Strategic Dashboard - Collapsible Dropdown Layout */}
          <div className="absolute top-14 left-[216px] z-50 font-sans">
            {/* Dropdown Trigger Button */}
            <button 
              onClick={() => setWorldDropdownOpen(!worldDropdownOpen)}
              className="px-3 h-10 bg-[#0c0d12]/92 backdrop-blur-md border border-[#3a352a]/70 hover:border-[#D9A957]/60 rounded-md pointer-events-auto shadow-xl w-56 flex items-center justify-between text-[#c2a461] hover:text-white transition-all cursor-pointer text-[10px] font-sans font-extrabold uppercase tracking-widest gap-2"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span>🌍</span>
                <span className="truncate">World: {selectedWorldContName}</span>
              </span>
              <span className="text-[9px] text-[#8a8470] transition-transform duration-200" style={{ transform: worldDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>
            
            {/* Expandable Dropdown Container */}
            {worldDropdownOpen && (
              <div className="absolute top-[44px] left-0 w-56 bg-[#0c0d12]/96 backdrop-blur-md border border-[#3a352a]/80 rounded-md pointer-events-auto shadow-2xl p-2.5 max-h-[350px] overflow-y-auto space-y-1.5 z-50">
                <div className="text-[9px] tracking-widest text-[#D9A957] font-sans font-extrabold uppercase pb-1.5 mb-1 text-center border-b border-[#3a352a]/30 select-none">
                  Select World Region
                </div>
                
                <div className="space-y-1.5 scrollbar-thin scrollbar-thumb-stone/30">
                  {CONTINENTS_DATA.map((cont) => (
                    <button 
                      key={cont.id}
                      className={`w-full text-left p-1.5 rounded border transition-all flex flex-col justify-start block ${
                        cont.active 
                          ? 'border-[#3a352a]/60 bg-[#161412]/60 hover:bg-[#201d19]/80 cursor-pointer hover:border-[#D9A957]/50' 
                          : 'border-transparent bg-[#08090d]/30 opacity-60 hover:opacity-100 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (cont.active) {
                          setSelectedWorldContName(cont.name);
                          jumpToContinent(cont.q, cont.r);
                          setWorldDropdownOpen(false);
                        } else {
                          setSelectedDistantContinent(cont);
                          setWorldDropdownOpen(false);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[9.5px] font-serif font-black ${cont.active ? 'text-[#c2a461]' : 'text-stone-light/50'}`}>
                          {cont.name}
                        </span>
                        <span className={`text-[7px] px-1 py-0.2 rounded font-mono ${cont.active ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-900/50' : 'bg-stone-900 text-stone-400 border border-stone-800'}`}>
                          {cont.active ? 'LIVE SIM' : 'DISTANT'}
                        </span>
                      </div>
                      <p className="text-[8px] text-stone-light/60 mt-0.5 leading-tight font-sans">
                        {cont.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Centered distant continent detail lore overlay */}
          {selectedDistantContinent && (
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-6 z-50 pointer-events-auto">
              <div className="bg-[#0f0e0c] border-2 border-[#D9A957] p-5.5 rounded-xl max-w-sm shadow-2xl text-stone-light font-sans text-center relative max-h-[90%] overflow-y-auto">
                <div className="text-[#D9A957] text-3xl mb-1 flex justify-center">🌐</div>
                <h3 className="text-lg font-serif font-bold text-accent mb-2">{selectedDistantContinent.name}</h3>
                <span className="text-[8.5px] font-mono uppercase bg-amber-950/40 text-amber-500 border border-amber-900 px-2 py-0.5 rounded-sm inline-block mb-3.5 tracking-wider">Unvisited Hemisphere Province</span>
                
                <p className="text-[10px] text-stone-light/80 leading-relaxed font-sans mb-5 text-left bg-ink/40 p-3 rounded-lg border border-[#3a352a]/30">
                  {selectedDistantContinent.detail}
                </p>

                <button 
                  onClick={() => setSelectedDistantContinent(null)}
                  className="px-4 py-1.5 bg-[#3a352a] hover:bg-[#4a4335] text-[#e8e2d2] rounded font-sans text-[10px] font-bold uppercase cursor-pointer select-none transition-all w-full"
                >
                  Close Expedition Dossier
                </button>
              </div>
            </div>
          )}

          {/* Double-layered zooming navigation buttons */}
          <div className="absolute top-4 right-4 z-40 flex flex-col gap-1 pointer-events-auto">
            <button 
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center bg-[#0c0d12]/92 border border-[#3a352a]/60 text-[#c2a461] hover:text-white rounded-md hover:bg-[#1a1c24] cursor-pointer shadow-lg hover:scale-105 duration-100 font-bold"
              title="Zoom In"
            >
              ＋
            </button>
            <button 
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center bg-[#0c0d12]/92 border border-[#3a352a]/60 text-[#c2a461] hover:text-white rounded-md hover:bg-[#1a1c24] cursor-pointer shadow-lg hover:scale-105 duration-100 font-bold"
              title="Zoom Out"
            >
              －
            </button>
          </div>

          {/* Beautiful expandable Map Legend in medieval parchment layout */}
          <div className="absolute bottom-4 left-4 z-40 p-2.5 bg-[#0c0d12]/92 backdrop-blur-md border border-[#3a352a]/60 rounded-md pointer-events-auto shadow-2xl max-w-[200px] font-sans">
            <div className="text-[8.5px] uppercase font-extrabold tracking-wider text-[#D9A957] mb-1.5 border-b border-[#3a352a]/30 pb-1">
              📜 Map Legend
            </div>
            <div className="flex flex-col gap-1.5 text-[8.5px]">
              <div className="flex items-center gap-1.5 text-stone-light">
                <span className="w-2 h-2 rounded-sm bg-[#2c3b24] border border-[#c2a461]/40" />
                <span>Plains (Grains & Farming)</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-light">
                <span className="w-2 h-2 rounded-sm bg-[#162a34] border border-[#c2a461]/40" />
                <span>Coast (Fisheries & Trade)</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-light">
                <span className="w-2 h-2 rounded-sm bg-[#393530] border border-[#c2a461]/40" />
                <span>Mountains (Ores & Mining)</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-light">
                <span className="w-2 h-2 rounded-sm bg-[#4d3e2d] border border-[#c2a461]/40" />
                <span>Hills & Highlands</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-light">
                <span className="w-2 h-2 rounded-sm bg-[#12261a] border border-[#c2a461]/40" />
                <span>Deep Forests (Timber & Furs)</span>
              </div>
              <div className="border-t border-[#3a352a]/20 mt-1 pt-1 flex flex-col gap-0.5 text-[#7a6e66]">
                <div>⚔️ Swallowtail: Deployed Army</div>
                <div>〰️ Waves: Wave Ripples</div>
                <div>🗺️ Coordinates: Mercator Grid</div>
              </div>
            </div>
          </div>

          {/* Gorgeous floating hover tooltip near the cursor */}
          {hoveredProvince && (
            <div 
              className="fixed pointer-events-none z-50 p-3 bg-[#0d0f14]/95 border-2 border-[#D9A957]/80 rounded-md shadow-2xl max-w-xs font-sans animate-fade-in text-stone-light"
              style={{ 
                left: `${hoverMousePos.x + 18}px`, 
                top: `${hoverMousePos.y - 12}px`,
                transform: "translate(0, -50%)"
              }}
            >
              <div className="text-[10px] uppercase font-bold text-[#e8e2d2] tracking-wider flex items-center justify-between border-b border-[#3a352a]/40 pb-1.5 mb-2 gap-6">
                <span>🏰 {hoveredProvince.name}</span>
                <span className="text-[8px] px-1 bg-[#D9A957]/15 text-[#D9A957] rounded-sm uppercase tracking-widest">{hoveredProvince.terrain}</span>
              </div>
              
              <div className="flex flex-col gap-1 font-mono text-[8.5px]">
                <div className="flex justify-between border-b border-[#3a352a]/20 pb-0.5">
                  <span className="text-stone-light/60">Prosperity Score:</span>
                  <span className="text-white font-semibold">{hoveredProvince.fertility}% Yield</span>
                </div>
                <div className="flex justify-between border-b border-[#3a352a]/20 pb-0.5">
                  <span className="text-stone-light/60">Sovereign Liege:</span>
                  <span className="text-[#c2a461]">{hoveredProvince.realmId || "No Leigelord"}</span>
                </div>
                <div className="flex justify-between border-b border-[#3a352a]/20 pb-0.5">
                  <span className="text-stone-light/60">Fortification:</span>
                  <span className="text-sky font-semibold">LVL {hoveredProvince.fortificationLevel} Keep</span>
                </div>
                <div className="flex justify-between border-b border-[#3a352a]/20 pb-0.5">
                  <span className="text-stone-light/60">Population:</span>
                  <span className="text-[#a3e635] font-semibold">{(hoveredProvince.population?.total || 0).toLocaleString()} Souls</span>
                </div>
                <div className="flex justify-between border-b border-[#3a352a]/20 pb-0.5">
                  <span className="text-stone-light/60">Primordial Goods:</span>
                  <span className="text-white uppercase">{hoveredProvince.resources?.[0]?.good || "None"}</span>
                </div>
                {hoveredProvince.disease && (
                  <div className="flex justify-between border-b border-[#3a352a]/20 pb-0.5 text-danger font-bold">
                    <span>Disease Miasma:</span>
                    <span>{hoveredProvince.disease.diseaseId} ({hoveredProvince.disease.severity}%)</span>
                  </div>
                )}
                <div className="flex justify-between text-[#7a6e66] pt-1">
                  <span>Coordinates:</span>
                  <span>q:{hoveredProvince.coords.q}, r:{hoveredProvince.coords.r}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapCanvas;
