import type { GameLoop } from '../engine/GameLoop';
import { HexCoord, hexDistance } from '../../utils/geo';
import { Army } from '../models/Army';
import { Battle, Siege } from '../models/Battle';
import { TERRAIN_DEFINITIONS } from '../models/Terrain';

export class MilitarySystem {
  constructor(private engine: GameLoop) {}

  tick() {
    this.processMovement();
    this.processStancesAndSupplies();
    this.processBattles();
    this.processSieges();
  }

  private processMovement() {
    // 1. Refresh movement points daily
    Object.values(this.engine.armies).forEach(army => {
      army.movementPoints = Math.min(100, army.movementPoints + 25); // Daily recovery

      // Process movement if path exists
      if (army.destination && army.path.length > 0) {
        const nextStep = army.path[0];
        
        // Calculate cost based on terrain & weather
        let cost = 15;
        const prov = Object.values(this.engine.provinces).find(p => 
          p.coords.q === nextStep.q && p.coords.r === nextStep.r
        );

        if (prov) {
          const tDef = TERRAIN_DEFINITIONS[prov.terrain] || TERRAIN_DEFINITIONS['PLAINS'];
          cost = tDef.movementCost;

          // Season-specific terrain changes
          const season = this.engine.clock.currentSeason;
          
          if (prov.terrain === 'MOUNTAINS' && season === 'WINTER') {
            // Impassable in winter without mountain pass. (Increase cost to maximum to block)
            cost = 100; // Demands full movement reserves (cannot move if points < 100)
          }

          if (prov.terrain === 'RIVER_VALLEY') {
            // River crossing ford
            if (season === 'SPRING') {
              // Floods in spring - impassable for 15-30 days
              cost = 100; // Impassable
            } else if (season === 'WINTER') {
              // Freezes in deep winter (cavalry crossing possible / standard speed)
              cost = 15; // Smooth frozen crossing
            }
          }

          if (prov.terrain === 'TUNDRA' && season === 'WINTER') {
            // Frozen roads/terrain in winter makes movement slow
            cost = 25;
          }

          // Weather additions
          if (prov.currentWeather === 'BLIZZARD' || prov.currentWeather === 'THUNDERSTORM') {
            cost += 15;
          }

          // Road quality reduces movement point drain
          cost = Math.max(5, cost - Math.floor((prov.roadQuality || 0) * 0.1));
        }

        if (army.movementPoints >= cost) {
          army.movementPoints -= cost;
          army.location = nextStep;
          army.path.shift(); // remove step taken

          // If reached target, clear destination
          if (army.path.length === 0) {
            army.destination = null;
          }
        }
      }
    });
  }

  private processStancesAndSupplies() {
    Object.values(this.engine.armies).forEach(army => {
      // Find province
      const province = Object.values(this.engine.provinces).find(p => 
        p.coords.q === army.location.q && p.coords.r === army.location.r
      );

      // Decrement supplies if in hostile bounds (abstract matching, 'enemy')
      const isHostileTerritory = province && province.ownerId !== army.commanderId;

      if (army.stance === 'FORAGE') {
        army.supplyLevel = Math.min(100, army.supplyLevel + 15);
        army.morale = Math.min(100, army.morale + 2);
      } else if (army.stance === 'RAID' && province) {
        army.supplyLevel = Math.min(100, army.supplyLevel + 10);
        const goldLooted = Math.floor(province.population.merchants * 0.1);
        province.population.total = Math.max(10, province.population.total - Math.floor(goldLooted * 0.5));
        army.loot += goldLooted;
        province.loyalty = Math.max(0, province.loyalty - 5);
        province.lastRaided = this.engine.clock.currentDay;
      } else {
        // Normal supply drain
        if (isHostileTerritory) {
          army.supplyLevel = Math.max(0, army.supplyLevel - 8);
        } else {
          // Recover supply in friendly lands
          army.supplyLevel = Math.min(100, army.supplyLevel + 12);
        }
      }

      // Attrition from no supplies or severe winter blizzard
      const isExtremeWinterBlizzard = province?.currentWeather === 'BLIZZARD' && this.engine.clock.currentSeason === 'WINTER';
      const isDesertHeat = province?.terrain === 'DESERT';
      const isWinterTundra = province?.terrain === 'TUNDRA' && this.engine.clock.currentSeason === 'WINTER';

      if (army.supplyLevel <= 0 || isExtremeWinterBlizzard || isDesertHeat || isWinterTundra) {
        army.attritionDays++;
        army.morale = Math.max(0, army.morale - 5);
        
        // Define base unit loss percentage
        let lossPercent = 0.02;

        if (isDesertHeat) {
          // Attrition 3x normal rate in deser/arid steppe
          lossPercent *= 3;
        }

        if (isWinterTundra) {
          // Cold exposure damage to unequipped troops / frostbite mechanic
          lossPercent += 0.02;
        }

        // Slay some soldiers in units
        army.units.forEach(unit => {
          const losses = Math.floor(unit.count * lossPercent);
          unit.count = Math.max(0, unit.count - losses);
        });

        army.units = army.units.filter(u => u.count > 0);
      } else {
        army.attritionDays = 0;
      }
    });
  }

  private processBattles() {
    const armies = Object.values(this.engine.armies);
    
    // Check if distinct armies are in the same location and are hostile
    for (let i = 0; i < armies.length; i++) {
      for (let j = i + 1; j < armies.length; j++) {
        const armyA = armies[i];
        const armyB = armies[j];

        if (armyA.location.q === armyB.location.q && armyA.location.r === armyB.location.r) {
          if (armyA.realmId !== armyB.realmId && armyA.units.length > 0 && armyB.units.length > 0) {
            // Initiate tactical clash battle!
            this.executeBattleClash(armyA, armyB);
          }
        }
      }
    }
  }

  private executeBattleClash(attacker: Army, defender: Army) {
    const province = Object.values(this.engine.provinces).find(p => 
      p.coords.q === attacker.location.q && p.coords.r === attacker.location.r
    );

    const provName = province ? province.name : "the open plains";
    const battleId = `battle_${Date.now()}`;

    // Look up general martial values
    const charA = this.engine.characters[attacker.commanderId];
    const charB = this.engine.characters[defender.commanderId];

    const martialA = charA ? charA.martial : 10;
    const martialB = charB ? charB.martial : 10;

    let initAttackerForce = attacker.units.reduce((sum, u) => sum + u.count, 0);
    let initDefenderForce = defender.units.reduce((sum, u) => sum + u.count, 0);

    // Get terrain multipliers (affects defense bonuses, cavalry, siege engines)
    const terrainType = province ? province.terrain : 'PLAINS';
    const tDef = TERRAIN_DEFINITIONS[terrainType] || TERRAIN_DEFINITIONS['PLAINS'];

    // Identify troop ratios to evaluate cavalry efficiency
    const getCavalryRatio = (army: Army) => {
      const cavCount = army.units
        .filter(u => u.isMounted)
        .reduce((sum, u) => sum + u.count, 0);
      const total = army.units.reduce((sum, u) => sum + u.count, 0);
      return total > 0 ? cavCount / total : 0;
    };

    const attCavRatio = getCavalryRatio(attacker);
    const defCavRatio = getCavalryRatio(defender);

    // Cavalry modifier scaling
    const attCavMod = 1 + (tDef.cavalryModifier - 1) * attCavRatio;
    const defCavMod = 1 + (tDef.cavalryModifier - 1) * defCavRatio;

    // Defense bonus reduces taken damage (e.g., Mountains defender is extremely shielded)
    const defenderDmgReductionFactor = 1 + (tDef.defenseBonus / 100);

    // Iterative fast melee clash
    let attCasualties = 0;
    let defCasualties = 0;

    // Attacker total damage (boosted or hampered by its cavalry modifier on the terrain)
    const attDmgBase = Math.floor(initAttackerForce * (0.05 + (martialA * 0.005)));
    const attDmg = Math.floor(attDmgBase * attCavMod);

    // Defender total damage
    const defDmgBase = Math.floor(initDefenderForce * (0.05 + (martialB * 0.005)));
    const defDmg = Math.floor(defDmgBase * defCavMod);

    // Apply casualties proportionally
    attacker.units.forEach(unit => {
      // Defender hits Attacker
      const losses = Math.floor(defDmg * (unit.count / initAttackerForce));
      unit.count = Math.max(0, unit.count - losses);
      attCasualties += losses;
    });

    defender.units.forEach(unit => {
      // Attacker hits Defender (mitigated by terrain defense bonus)
      const lossesBeforeMitigation = Math.floor(attDmg * (unit.count / initDefenderForce));
      const losses = Math.floor(lossesBeforeMitigation / defenderDmgReductionFactor);
      unit.count = Math.max(0, unit.count - losses);
      defCasualties += losses;
    });

    attacker.units = attacker.units.filter(u => u.count > 0);
    defender.units = defender.units.filter(u => u.count > 0);

    // Morale decrease
    attacker.morale = Math.max(0, attacker.morale - Math.floor((attCasualties / (initAttackerForce || 1)) * 100));
    defender.morale = Math.max(0, defender.morale - Math.floor((defCasualties / (initDefenderForce || 1)) * 100));

    const attRemaining = attacker.units.reduce((sum, u) => sum + u.count, 0);
    const defRemaining = defender.units.reduce((sum, u) => sum + u.count, 0);

    let winnerName = "";
    let loserName = "";
    let finalStatus: 'ATTACKER_VICTORY' | 'DEFENDER_VICTORY' | 'DRAW' = 'DRAW';

    if (attRemaining <= 0 || attacker.morale <= 15) {
      finalStatus = 'DEFENDER_VICTORY';
      winnerName = defender.name;
      loserName = attacker.name;
      // Retreat attacker to safe hexagon (let's offset q slightly)
      attacker.location.q -= 1;
      attacker.morale = 25;
    } else if (defRemaining <= 0 || defender.morale <= 15) {
      finalStatus = 'ATTACKER_VICTORY';
      winnerName = attacker.name;
      loserName = defender.name;
      // Retreat defender to safe hexagon
      defender.location.q += 1;
      defender.morale = 25;
    }

    const narrative = `${winnerName} achieved a victory over ${loserName} at the Battle of ${provName} (Terrain: ${tDef.name}). Initial troops: ${initAttackerForce} vs ${initDefenderForce}. Damage mitigation: ${tDef.defenseBonus}% for defender. Casualties: ${attCasualties} attackers, ${defCasualties} defenders.`;
    
    this.engine.battles[battleId] = {
      id: battleId,
      attackerId: attacker.id,
      defenderId: defender.id,
      location: attacker.location,
      provinceId: province ? province.id : '',
      startTick: this.engine.clock.currentDay,
      endTick: this.engine.clock.currentDay,
      status: finalStatus,
      phases: [{ name: 'CLASH', durationTicks: 1 }],
      attackerCasualties: attCasualties,
      defenderCasualties: defCasualties,
      attackerMoraleCollapse: attacker.morale <= 15,
      defenderMoraleCollapse: defender.morale <= 15,
      weatherConditions: province?.currentWeather || 'CLEAR',
      terrainAdvantage: martialA > martialB ? 'attacker' : 'defender',
      narrativeSummary: narrative
    };

    this.engine.alertSystem.queueAlert(`Decisive Clash: ${narrative}`, finalStatus === 'ATTACKER_VICTORY' ? 'CRITICAL' : 'URGENT');
  }

  private processSieges() {
    Object.values(this.engine.armies).forEach(army => {
      if (army.stance === 'BESIEGE') {
        const province = Object.values(this.engine.provinces).find(p => 
          p.coords.q === army.location.q && p.coords.r === army.location.r
        );

        if (province && province.ownerId !== 'player') {
          province.isBesieged = true;
          
          if (province.siegeProgress === null) province.siegeProgress = 0;
          
          // Siege progress addition based on martial skill
          const char = this.engine.characters[army.commanderId];
          const martial = char ? char.martial : 10;
          
          // Base progress speed
          let delta = 5 + (martial * 0.3);

          // Apply siege weapon bonuses if the besieger's faction (player/attacker) has siege workshops
          let playerHasSiegeWorkshop = false;
          Object.values(this.engine.provinces).forEach(prov => {
            if (prov.ownerId === 'player' && prov.buildings?.some((b: any) => b.typeId === 'SIEGE_WORKSHOP')) {
              playerHasSiegeWorkshop = true;
            }
          });
          if (playerHasSiegeWorkshop) {
            delta *= 1.25; // +25% faster breaches with siege machinery
          }

          // Apply province defensive structures and walls
          let localWallsLevel = province.fortificationLevel ?? 1; // 1-5 levels of walls
          let localHasGatehouse = province.buildings?.some((b: any) => b.typeId === 'GATEHOUSE');
          let localHasMoat = province.buildings?.some((b: any) => b.typeId === 'MOAT');
          let localHasKeep = province.buildings?.some((b: any) => b.typeId === 'CASTLE_KEEP');

          // Walls reduce breach rates
          const wallMitigation = Math.max(0.4, 1 - (localWallsLevel * 0.10)); // up to -50% breach rate
          delta *= wallMitigation;

          if (localHasGatehouse) delta *= 0.85; // Gatehouse slows siege progress by 15%
          if (localHasMoat) delta *= 0.85; // Moat slows siege progress by 15%
          if (localHasKeep) delta *= 0.75; // Castle Keep slows siege progress by 25%
          
          province.siegeProgress = Math.min(100, province.siegeProgress + delta);

          if (province.siegeProgress >= 100) {
            // Province falls! Update ownership
            province.ownerId = 'player';
            province.controlledBy = army.id;
            province.isBesieged = false;
            province.siegeProgress = null;
            
            this.engine.alertSystem.queueAlert(`Victory! The fortifications of ${province.name} have breached and yielded to your host!`, 'CRITICAL');
          }
        }
      }
    });

    // Reset sieges if no besieging army
    Object.values(this.engine.provinces).forEach(province => {
      if (province.isBesieged) {
        const hasBesieger = Object.values(this.engine.armies).some(army => 
          army.stance === 'BESIEGE' && 
          army.location.q === province.coords.q && 
          army.location.r === province.coords.r
        );

        if (!hasBesieger) {
          province.isBesieged = false;
          province.siegeProgress = null;
        }
      }
    });
  }
}
