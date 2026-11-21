import type { GameLoop } from '../engine/GameLoop';
import { TERRAIN_DEFINITIONS } from '../models/Terrain';
import { BUILDING_TYPES } from '../../data/building-types';
import { getActiveLaw } from '../../data/law-catalogue';

export class EconomySystem {
  constructor(private engine: GameLoop) {}
  
  tick() {
    const isNewMonth = this.engine.clock.currentDay % 30 === 0;
    let totalTaxCollected = 0;

    // Process economy every day
    Object.values(this.engine.provinces).forEach(province => {
      // Basic consumption
      let foodRequired = province.population.total * 0.01;
      
      // Get terrain definition
      const def = TERRAIN_DEFINITIONS[province.terrain] || TERRAIN_DEFINITIONS['PLAINS'];
      
      // Basic production (depends on terrain modifier and fertility with devastation penalty)
      const baseFertility = province.fertility ?? 50;
      const actualFertility = province.devastatedTimeLeft ? Math.max(5, baseFertility - 50) : baseFertility;
      const fertilityMod = actualFertility / 50;
      let foodProduced = province.population.serfs * 0.015 * def.agricultureModifier * fertilityMod;
      
      // Support Mill, Warehouse, and Granary buildings
      let localHasMill = false;
      let localHasWarehouse = false;
      let localHasGranary = false;
      let localHasCourthouse = false;
      let localHasPrison = false;

      province.buildings?.forEach((b: any) => {
        if (b.typeId === 'MILL') localHasMill = true;
        if (b.typeId === 'WAREHOUSE') localHasWarehouse = true;
        if (b.typeId === 'GRANARY') localHasGranary = true;
        if (b.typeId === 'COURTHOUSE') localHasCourthouse = true;
        if (b.typeId === 'PRISON') localHasPrison = true;
      });

      if (localHasMill) {
        foodProduced *= 1.25; // Mill increases crop productivity by 25%
      }
      if (localHasWarehouse) {
        foodRequired *= 0.85; // Warehouse reduces waste and spoilage (15% reduction)
      }
      
      // Salted or ruined land produces far less
      if (province.salted) foodProduced *= 0.1;
      if (province.ruined) foodProduced *= 0.4;

      // Sickeness hits food production
      if (province.disease) {
        const dId = province.disease.diseaseId;
        if (dId === 'PLAGUE') foodProduced *= 0.2; // -80% production
        else if (dId === 'FAMINE_SICKNESS') foodProduced *= 0.5; // -50% agricultural output
        else if (dId === 'CAMP_FEVER') foodProduced *= 0.7; // -30%
        else if (dId === 'POX') foodProduced *= 0.8; // -20%
      }

      // Special production based on Terrain archetype
      let extraGoldFromResources = 0;
      if (province.terrain === 'MOUNTAINS') {
        // Mining bonus (iron, stone, gold)
        extraGoldFromResources += 12; // Extra daily revenue from mountain mines
      } else if (province.terrain === 'WETLAND') {
        // Fish production, salt flats
        foodProduced += 5; // Marsh foragers harvest fish/salt
      } else if (province.terrain === 'DEEP_FOREST' || province.terrain === 'FOREST') {
        // Lumber production
        extraGoldFromResources += 6; // Lumberjacks clearing outer edges
      }
      
      // Seasons affect production vastly
      if (this.engine.clock.currentSeason === 'WINTER') {
        // Winter tundra produces extremely little standard food, but has Reindeer herding
        if (province.terrain === 'TUNDRA') {
          foodProduced = 4; // Reindeer herding yields basic food during winters
        } else {
          foodProduced *= 0.1;
        }
      }

      // Unrest from starvation
      if (foodProduced < foodRequired) {
        // Pull the shortfall from global food reserves first
        const shortfall = foodRequired - foodProduced;
        this.engine.resources.food = Math.max(0, this.engine.resources.food - shortfall);

        // If global food is also exhausted, trigger loyalty hit
        if (this.engine.resources.food <= 0) {
          if (this.engine.rng.next() < 0.1) {
              province.loyalty = Math.max(0, province.loyalty - (localHasCourthouse ? 0.5 : 1));
              if (province.loyalty < 30) province.population.mood = 'ANGRY';
          }
        }
      } else {
        // Province is self-sufficient — still consume its fair share from global pool
        this.engine.resources.food = Math.max(0, this.engine.resources.food - foodRequired);

        if (this.engine.rng.next() < 0.05) {
            province.loyalty = Math.min(100, province.loyalty + (localHasPrison ? 1.5 : 1));
            if (province.loyalty > 60) province.population.mood = 'CONTENT';
        }
      }

      // Passively recover loyalty if court and prisons exist
      if (localHasCourthouse && province.loyalty < 100) {
        province.loyalty = Math.min(100, province.loyalty + 0.05); // constant stability pacification
      }

      // Collect taxes on month boundaries
      if (isNewMonth && province.ownerId === 'player') {
        const taxLaw = getActiveLaw(this.engine, 'TAXATION');
        let taxMultiplier = taxLaw.effects.taxMultiplier ?? 1.0;
        
        const tradeLaw = getActiveLaw(this.engine, 'TRADE');
        let tradeMultiplier = tradeLaw.effects.tradeMultiplier ?? 1.0;

        // Collect silver levies from serfs and gold tariffs from merchants
        let serfTaxes = province.population.serfs * 0.02 * (province.loyalty / 100) * taxMultiplier;
        let merchantTaxes = province.population.merchants * 0.08 * (province.loyalty / 100) * taxMultiplier * tradeMultiplier;
        
        // Custom building tax buffs
        let localHasMarket = false;
        let localHasHarbor = false;
        let localHasWinery = false;
        let localHasSaltWorks = false;
        let localHasGuildhall = false;
        let localHasChurch = false;
        let localHasCathedral = false;
        let localHasHolyShrine = false;

        province.buildings?.forEach((b: any) => {
          if (b.typeId === 'MARKET') localHasMarket = true;
          if (b.typeId === 'HARBOR') localHasHarbor = true;
          if (b.typeId === 'WINERY') localHasWinery = true;
          if (b.typeId === 'SALT_WORKS') localHasSaltWorks = true;
          if (b.typeId === 'GUILDHALL') localHasGuildhall = true;
          if (b.typeId === 'CHURCH') localHasChurch = true;
          if (b.typeId === 'CATHEDRAL') localHasCathedral = true;
          if (b.typeId === 'HOLY_SHRINE') localHasHolyShrine = true;
        });

        if (localHasMarket) {
          merchantTaxes *= 1.20; // +20% merchant tax
        }
        if (localHasHarbor && province.terrain === 'COAST') {
          merchantTaxes *= 1.35; // +35% coastal harbor tariff
        }

        // Active disease collapses taxes
        if (province.disease) {
          const dId = province.disease.diseaseId;
          if (dId === 'PLAGUE') {
            serfTaxes *= 0.15; // 85% tax collapse from Black Death
            merchantTaxes *= 0.10; // 90% commerce trade collapse
          } else if (dId === 'FAMINE_SICKNESS') {
            serfTaxes *= 0.40;
            merchantTaxes *= 0.60;
          } else if (dId === 'CAMP_FEVER' || dId === 'POX') {
            serfTaxes *= 0.80;
            merchantTaxes *= 0.70;
          }
        }

        let totalProvTax = Math.floor(serfTaxes + merchantTaxes) + extraGoldFromResources * 30; // 30 days of resource accumulation
        
        // Add flat building tariffs / exports
        if (localHasWinery) totalProvTax += 60; // winery vintage exports
        if (localHasSaltWorks) totalProvTax += 80; // salt spring trade tariffs
        if (localHasGuildhall) totalProvTax += 40; // guild wealth commissions
        if (localHasChurch) totalProvTax += 15; // tithes
        if (localHasCathedral) totalProvTax += 50; // diocese collections
        if (localHasHolyShrine) totalProvTax += 25; // pilgrim tourism

        // Desert-specific scarcity taxes or water trade tariffs
        if (province.terrain === 'DESERT') {
          totalProvTax += 45; // Water supply trade tariff
        }
        
        totalTaxCollected += totalProvTax;
      }

      // Degrade buildings monthly
      if (isNewMonth && province.buildings) {
        province.buildings.forEach((b: any) => {
          if (b.condition !== undefined) {
            // Degrade by 1 to 3 points randomly
            const degradation = 1 + Math.floor(this.engine.rng.next() * 3);
            b.condition = Math.max(0, b.condition - degradation);
          }
        });
        
        // Destroy buildings that reached 0 condition
        const beforeCount = province.buildings.length;
        province.buildings = province.buildings.filter((b: any) => b.condition === undefined || b.condition > 0);
        const afterCount = province.buildings.length;
        if (beforeCount > afterCount && province.ownerId === 'player') {
          this.engine.alertSystem.queueAlert(`A dilapidated building in ${province.name} has collapsed from disrepair!`, 'URGENT');
        }
      }
    });

    if (isNewMonth) {
      // Treasury building lowers monthly corruption gold bleed
      let hasTreasuryCount = 0;
      let buildingUpkeepTotal = 0;

      Object.values(this.engine.provinces).forEach(prov => {
        if (prov.ownerId === 'player') {
          prov.buildings?.forEach((b: any) => {
            if (b.typeId === 'TREASURY') hasTreasuryCount++;
            
            // Tally building upkeep dynamically instead of using hardcoded values
            const bDef = BUILDING_TYPES[b.typeId];
            if (bDef && bDef.upkeep) {
              buildingUpkeepTotal += bDef.upkeep;
            }
          });
        }
      });
      
      this.engine.treasury.buildingUpkeep = buildingUpkeepTotal;
      
      let baseUpkeep = this.engine.treasury.militaryUpkeep + this.engine.treasury.buildingUpkeep + this.engine.treasury.courtUpkeep;
      let afterTreasuryUpkeep = baseUpkeep;
      if (hasTreasuryCount > 0) {
        // Secure vaults reduces gold bleed / administrative wastes (up to 40% reduction)
        const discountFactor = Math.max(0.6, 1 - (hasTreasuryCount * 0.15));
        afterTreasuryUpkeep = Math.floor(baseUpkeep * discountFactor);
      }

      const netTax = totalTaxCollected - afterTreasuryUpkeep;

      this.engine.treasury.taxRevenue = totalTaxCollected;
      this.engine.treasury.goldBalance = Math.max(0, this.engine.treasury.goldBalance + netTax);
      this.engine.treasury.goldPerTick = netTax;

      // Update dynamic market prices based on supply/demand for the UI
      if (this.engine.aureliaSim?.settlementHierarchies) {
        Object.values(this.engine.aureliaSim.settlementHierarchies).forEach(sets => {
          sets.forEach(settlement => {
            const baseValue = 15;
            // Demand is driven by population. Supply is lastYield.
            const supplyFactor = settlement.lastYield > 0 ? (settlement.population * 0.05 / settlement.lastYield) : 2.5;
            // Price fluctuates between 0.5x and 3.0x base value, plus random noise
            const boundedFactor = Math.max(0.5, Math.min(3.0, supplyFactor));
            settlement.marketValue = Math.max(1, Math.floor(baseValue * boundedFactor * (1 + (this.engine.rng.next() - 0.5) * 0.2)));
          });
        });
      }

      // Alert about monthly audits
      this.engine.alertSystem.queueAlert(
        `Monthly Treasury Audit: Collected ${totalTaxCollected} gold in taxes. Net monthly income: ${netTax} gold.`,
        netTax >= 0 ? 'NORMAL' : 'URGENT'
      );
    }
  }
}
