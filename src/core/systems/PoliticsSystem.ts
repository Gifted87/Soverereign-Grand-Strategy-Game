import type { GameLoop } from '../engine/GameLoop';
import { Faction, Plot } from '../models/Faction';
import { Character } from '../models/Character';
import { nanoid } from 'nanoid';

export class PoliticsSystem {
  constructor(private engine: GameLoop) {}

  tick() {
    this.processAgesAndHealth();
    this.processFactionsAndRebellion();
    this.processDynastyRelations();
    this.processVassalNPCs();
    this.processNPCModules();
  }

  private processAgesAndHealth() {
    const currentDay = this.engine.clock.currentDay;
    const isNewYear = currentDay % 365 === 0;

    Object.values(this.engine.characters).forEach(character => {
      if (!character.isAlive) return;

      // 1. Annual Aging
      if (isNewYear) {
        character.age++;
        // Very simple chance of catching a disease after turning 50
        if (character.age > 50 && this.engine.rng.next() < 0.05) {
          character.health = Math.max(10, character.health - 15);
        }
      }

      // 2. Health check / natural mortality
      if (character.health <= 0) {
        this.killCharacter(character, "Poor Health");
        return;
      }

      const deathChance = Math.max(0, (character.age - 60) * 0.0001);
      if (this.engine.rng.next() < deathChance) {
        this.killCharacter(character, "Old Age");
        return;
      }

      // 3. Pregnancy cycles & Childbirth
      if (character.isPregnant) {
        // births occur randomly after a tick threshold, let's say 2% chance per day
        if (this.engine.rng.next() < 0.03) {
          character.isPregnant = false;
          
          const isBoy = this.engine.rng.next() < 0.5;
          const childId = `char_${Date.now()}_child`;
          const baseName = isBoy ? "Vidal" : "Isabella";
          
          const newChild: Character = {
            id: childId,
            firstName: baseName,
            lastName: character.lastName,
            dynastyId: character.dynastyId,
            isPlayer: false,
            gender: isBoy ? 'MALE' : 'FEMALE',
            age: 0,
            health: 100,
            fertility: 100,
            isPregnant: false,
            isAlive: true,
            causeOfDeath: null,
            deathDate: null,
            birthProvinceId: character.birthProvinceId,
            religion: character.religion,
            culture: character.culture,
            languagesSpoken: character.languagesSpoken,
            title: null,
            position: null,
            traits: [],
            virtues: [],
            flaws: [],
            secretTrait: null,
            fatherId: character.gender === 'MALE' ? character.id : character.spouseId,
            motherId: character.gender === 'FEMALE' ? character.id : character.spouseId,
            spouseId: null,
            childrenIds: [],
            siblingIds: [...character.childrenIds], // previous siblings
            loverIds: [],
            enemyIds: [],
            allyIds: [],
            mentorId: null,
            diplomacy: 5,
            martial: 5,
            stewardship: 5,
            intrigue: 5,
            learning: 5,
            piety: 10,
            ambition: 'WEALTH',
            opinion: {},
            suspicion: {},
            memories: [],
            traumaIds: [],
            primaryTitle: null,
            heldTitles: [],
            landedProvinceIds: [],
            goldHoldings: 0
          };

          this.engine.characters[childId] = newChild;
          character.childrenIds.push(childId);

          this.engine.chronicleSystem.add(
            this.engine.clock.currentYear,
            this.engine.clock.currentDay,
            `A healthy child, ${newChild.firstName}, was born to the ${character.lastName} house line.`,
            'NORMAL'
          );
        }
      } else if (character.gender === 'FEMALE' && character.spouseId && character.age < 45) {
        // Chance to become pregnant
        if (this.engine.rng.next() < 0.002) {
          character.isPregnant = true;
        }
      }
    });
  }

  private killCharacter(character: Character, cause: string) {
    character.isAlive = false;
    character.causeOfDeath = cause;
    character.deathDate = this.engine.clock.currentDay;

    this.engine.chronicleSystem.add(
      this.engine.clock.currentYear,
      this.engine.clock.currentDay,
      `${character.firstName} ${character.lastName} has died of ${cause} at age ${character.age}.`,
      'URGENT'
    );

    // Perform Feudal Succession
    let heir: Character | null = null;
    
    // Eldest child first
    for (const childId of character.childrenIds) {
      const child = this.engine.characters[childId];
      if (child && child.isAlive) {
        heir = child;
        break;
      }
    }

    // Then Sibling
    if (!heir) {
      for (const sibId of character.siblingIds) {
        const sib = this.engine.characters[sibId];
        if (sib && sib.isAlive) {
          heir = sib;
          break;
        }
      }
    }

    // Successor inherits titles, landed provinces, and gold
    if (heir) {
      heir.primaryTitle = character.primaryTitle;
      heir.heldTitles = [...character.heldTitles];
      heir.landedProvinceIds = [...character.landedProvinceIds];
      heir.goldHoldings += character.goldHoldings;

      // Transfer provinces ownership
      character.landedProvinceIds.forEach(pId => {
        const province = this.engine.provinces[pId];
        if (province) {
          province.ownerId = heir!.id;
        }
      });

      if (character.isPlayer) {
        heir.isPlayer = true;
        this.engine.alertSystem.queueAlert(
          `Your lord has fallen! You are now playing as your heir, ${heir.firstName} ${heir.lastName}.`,
          'CRITICAL'
        );
      } else {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          this.engine.clock.currentDay,
          `${heir.firstName} inherits the lands of ${character.lastName}.`,
          'NORMAL'
        );
      }
    } else {
      // House becomes extinct
      const dynasty = this.engine.dynasties[character.dynastyId];
      if (dynasty) {
        dynasty.extinct = true;
      }
    }
  }

  private processFactionsAndRebellion() {
    const currentDay = this.engine.clock.currentDay;

    // Check if disgruntled nobles want to form or join factions
    Object.values(this.engine.characters).forEach(character => {
      if (!character.isAlive || character.isPlayer) return;

      const player = Object.values(this.engine.characters).find(c => c.isPlayer);
      if (!player) return;

      const opinionOfPlayer = character.opinion[player.id] || 0;

      if (opinionOfPlayer < -30) {
        // High likelihood to join noble rights faction
        let faction = Object.values(this.engine.factions).find(f => f.type === 'NOBLE_RIGHTS');
        
        if (!faction) {
          const facId = `fac_noble_rights`;
          faction = {
            id: facId,
            realmId: 'realm_1',
            name: 'The Noble Rights Defense Coalition',
            type: 'NOBLE_RIGHTS',
            leader: character.id,
            members: [character.id],
            strength: 15,
            demands: [{ description: 'Exemption from extra crown scutages' }],
            isActive: true,
            plotStage: 'FORMING',
            treasuryFunding: 100,
            hasPlayerDiscovered: true
          };
          this.engine.factions[facId] = faction;
          this.engine.alertSystem.queueAlert(`A political faction is forming: ${faction.name}`, 'URGENT');
        } else if (!faction.members.includes(character.id)) {
          faction.members.push(character.id);
          faction.strength += 20;
        }
      }
    });

    // Tick faction status
    Object.values(this.engine.factions).forEach(faction => {
      if (faction.strength > 75 && faction.plotStage === 'FORMING') {
        faction.plotStage = 'DEMANDING';
        this.engine.alertSystem.queueAlert(
          `REBELLIOUS DEMAND: ${faction.name} is making bold demands! Check your political screen immediately.`,
          'CRITICAL'
        );
      }

      // Chance to initiate rebellion if demands are unaddressed
      if (faction.plotStage === 'DEMANDING' && this.engine.rng.next() < 0.05) {
        faction.plotStage = 'REVOLTING';
        this.triggerNobleRebellion(faction);
      }
    });
  }

  private triggerNobleRebellion(faction: Faction) {
    this.engine.chronicleSystem.add(
      this.engine.clock.currentYear,
      this.engine.clock.currentDay,
      `CIVIL WAR ENKINDLED! ${faction.name} has risen in open revolt!`,
      'CRITICAL'
    );

    // Spawn a hostile rebel army matching their faction size in one of player's provinces
    const provinceToRebel = Object.values(this.engine.provinces).find(p => p.ownerId === 'player');
    if (provinceToRebel) {
      provinceToRebel.ownerId = 'rebel';
      provinceToRebel.loyalty = 0;

      const rebelId = `army_rebel_${Date.now()}`;
      this.engine.armies[rebelId] = {
        id: rebelId,
        name: 'Noble Insurgents',
        realmId: 'rebel',
        commanderId: faction.leader,
        officerIds: [],
        units: [
          {
            id: `unit_${rebelId}_1`,
            type: 'PEASANT_MOB' as any,
            count: 1200,
            maxCount: 1200,
            strength: 70,
            morale: 60,
            experience: 10,
            equipmentQuality: 30,
            supplyConsumed: 2,
            upkeepCost: 5,
            formation: 'LOOSE',
            isMounted: false,
            isRanged: true,
            hasArmor: 'NONE' as any,
            specialAbility: null
          }
        ],
        location: provinceToRebel.coords,
        destination: null,
        path: [],
        movementPoints: 50,
        supplyLevel: 100,
        supplyConvoyId: null,
        morale: 80,
        discipline: 40,
        experience: 15,
        stance: 'BESIEGE',
        orders: [],
        pendingOrders: [],
        isExhausted: false,
        frostbiteRisk: 0,
        diseases: [],
        deserterRate: 0,
        loot: 0,
        attritionDays: 0
      };

      this.engine.alertSystem.queueAlert(
        `Noble rebels have seized control of the administration in ${provinceToRebel.name}! Recruit a force and strike them!`,
        'CRITICAL'
      );
    }
  }

  private processDynastyRelations() {
    // Dynamic prestige gain for dynasties based on members active stats
    Object.values(this.engine.dynasties).forEach(dynasty => {
      let activePrestigeBonus = 0;
      Object.values(this.engine.characters).forEach(character => {
        if (character.isAlive && character.dynastyId === dynasty.id) {
          activePrestigeBonus += character.piety * 0.01 + character.martial * 0.1;
        }
      });
      dynasty.renown += Math.floor(activePrestigeBonus);
    });
  }

  private processVassalNPCs() {
    const currentDay = this.engine.clock.currentDay;
    if (currentDay === 0 || currentDay % 30 !== 0) return;

    const player = Object.values(this.engine.characters).find(c => c.isPlayer);
    if (!player) return;

    // 1. Sir Godefroy (The Loyal Veteran)
    const veteran = this.engine.characters['vassal_veteran'];
    if (veteran && veteran.isAlive) {
      const opinion = veteran.opinion[player.id] || 0;
      if (opinion >= 30) {
        // High opinion: recruits training
        this.engine.treasury.goldBalance += 100; // Veteran funds 100 gold for legions
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Sir Godefroy Bouillon organized military drills, saving 100 gold in recruitment costs for the Crown.`,
          'NORMAL'
        );
      } else if (opinion < 0) {
        // Neglected: slips opinion
        veteran.opinion[player.id] = Math.max(-100, (veteran.opinion[player.id] || 0) - 2);
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Sir Godefroy Bouillon grumbles at court, complaining of the Crown's neglect.`,
          'NORMAL'
        );
      }
    }

    // 2. Robert (The Ambitious Nephew)
    const nephew = this.engine.characters['vassal_nephew'];
    if (nephew && nephew.isAlive) {
      const opinion = nephew.opinion[player.id] || 0;
      if (opinion <= -10) {
        const stole = Math.floor(this.engine.rng.next() * 50) + 30;
        if (this.engine.treasury.goldBalance >= stole) {
          this.engine.treasury.goldBalance -= stole;
          nephew.goldHoldings += stole;
          this.engine.chronicleSystem.add(
            this.engine.clock.currentYear,
            currentDay,
            `Nephew Robert diverted ${stole} gold of state revenues to private funds.`,
            'NORMAL'
          );
          this.engine.alertSystem.queueAlert(
            `Spies suspect Robert has quietly reassigned crown chest coppers to himself!`,
            'URGENT'
          );
        }
      } else if (opinion > 40) {
        nephew.stewardship = Math.min(25, nephew.stewardship + 1);
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Robert studies castle administration to win your favor. His Stewardship increased.`,
          'NORMAL'
        );
      }
    }

    // 3. Bishop Baldwin (The Pious Bishop)
    const bishop = this.engine.characters['vassal_bishop'];
    if (bishop && bishop.isAlive) {
      const opinion = bishop.opinion[player.id] || 0;
      if (opinion >= 30) {
        player.piety = (player.piety || 0) + 15;
        this.engine.treasury.goldBalance += 120;
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Bishop Baldwin Clairvaux praises your holy devotion, donating a church tithe of 120 gold.`,
          'NORMAL'
        );
      } else if (opinion < -20) {
        player.piety = Math.max(0, (player.piety || 0) - 10);
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Bishop Baldwin Clairvaux denounces the sovereign's lack of devotion at church altar. Piety decreased.`,
          'NORMAL'
        );
        this.engine.alertSystem.queueAlert(
          `Bishop Baldwin is publicly condemning your religious indifference!`,
          'URGENT'
        );
      }
    }

    // 4. Master Thaddeus (The Greedy Merchant)
    const merchant = this.engine.characters['vassal_merchant'];
    if (merchant && merchant.isAlive) {
      const opinion = merchant.opinion[player.id] || 0;
      if (opinion < 10) {
        const skimmed = 80;
        this.engine.treasury.goldBalance = Math.max(0, this.engine.treasury.goldBalance - skimmed);
        merchant.goldHoldings += skimmed;
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Master Thaddeus Guildford withheld tax receipts on town imports, costing ${skimmed} gold.`,
          'NORMAL'
        );
      } else if (opinion >= 30) {
        this.engine.treasury.goldBalance += 150;
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Master Thaddeus Guildford subsidized trade channels, paying 150 gold into the treasury.`,
          'NORMAL'
        );
      }
    }

    // 5. Baron Roger (The Xenophobic Baron)
    const baron = this.engine.characters['vassal_baron'];
    if (baron && baron.isAlive) {
      const opinion = baron.opinion[player.id] || 0;
      if (opinion < -10) {
        this.engine.treasury.goldBalance = Math.max(0, this.engine.treasury.goldBalance - 40);
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Baron Roger Haverhill restricted travel, choking merchant trails and losing 40 gold.`,
          'NORMAL'
        );
      } else if (opinion >= 35) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Baron Roger's border guards successfully blocked rogue border spies. Security holds.`,
          'NORMAL'
        );
      }
    }

    // 6. Earl Richard (The Coward Lord)
    const coward = this.engine.characters['vassal_coward'];
    if (coward && coward.isAlive) {
      const opinion = coward.opinion[player.id] || 0;
      if (opinion < -10) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Earl Richard Cotswold delays call to military mobilization, securing his private estate.`,
          'NORMAL'
        );
      } else if (opinion >= 30) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Earl Richard Cotswold sends a gift of select wines to court, maintaining relations.`,
          'NORMAL'
        );
      }
    }

    // 7. Sir Eldred (The Beloved Local)
    const localNoble = this.engine.characters['vassal_local'];
    if (localNoble && localNoble.isAlive) {
      const opinion = localNoble.opinion[player.id] || 0;
      if (opinion >= 30) {
        Object.values(this.engine.provinces).forEach(prov => {
          if (prov.ownerId === 'player') {
            prov.loyalty = Math.min(100, prov.loyalty + 4);
          }
        });
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Sir Eldred Aethelgard tours the harvest fields, boosting local province loyalty.`,
          'NORMAL'
        );
      } else if (opinion < -15) {
        Object.values(this.engine.provinces).forEach(prov => {
          if (prov.ownerId === 'player') {
            prov.loyalty = Math.max(0, prov.loyalty - 3);
          }
        });
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Sir Eldred Aethelgard speaks to farmers against crown taxation. Local loyalty sinks.`,
          'NORMAL'
        );
      }
    }

    // 8. Count Geoffrey (The Schemer)
    const schemer = this.engine.characters['vassal_schemer'];
    if (schemer && schemer.isAlive) {
      const opinion = schemer.opinion[player.id] || 0;
      if (opinion < 0) {
        Object.values(this.engine.characters).forEach(v => {
          if (v.id !== 'player' && v.id !== 'vassal_schemer' && v.opinion && v.opinion['player'] !== undefined) {
            v.opinion['player'] = Math.max(-100, v.opinion['player'] - 2);
          }
        });
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Whispers of slander spread through court, courtesy of Geoffrey's rumors. Vassal opinion of you suffers.`,
          'NORMAL'
        );
      } else if (opinion >= 40) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Count Geoffrey Montdidier reports in-court chatter, helping deflect foreign spies.`,
          'NORMAL'
        );
      }
    }

    // 9. Lord Berenger (The Drunkard)
    const drunkard = this.engine.characters['vassal_drunkard'];
    if (drunkard && drunkard.isAlive) {
       const roll = this.engine.rng.next();
       if (roll < 0.4) {
         this.engine.chronicleSystem.add(
           this.engine.clock.currentYear,
           currentDay,
           `Lord Berenger Gisors throws a rowdy feast; vassals are pleased but hungover.`,
           'NORMAL'
         );
         Object.values(this.engine.characters).forEach(v => {
           if (v.id !== 'player' && v.id !== 'vassal_drunkard' && v.opinion && v.opinion['player'] !== undefined) {
             v.opinion['player'] = Math.max(-100, Math.min(100, v.opinion['player'] + 2));
           }
         });
         drunkard.opinion[player.id] = Math.max(-100, Math.min(100, (drunkard.opinion[player.id] || 0) + 10));
       } else if (roll > 0.8) {
         this.engine.chronicleSystem.add(
           this.engine.clock.currentYear,
           currentDay,
           `Lord Berenger loses village vault keys in a tavern game, wasting 50 royal gold.`,
           'NORMAL'
         );
         this.engine.treasury.goldBalance = Math.max(0, this.engine.treasury.goldBalance - 50);
       }
    }
  }

  private processNPCModules() {
    const currentDay = this.engine.clock.currentDay;
    if (currentDay === 0 || currentDay % 30 !== 0) return;

    this.processForeignRulers();
    this.processCouncilAdvisors();
    this.processHeirsAndFamily();
    this.processClergyNPCs();
    this.processMerchantGuildNPCs();
    this.processMilitaryNPCs();
    this.processAggregatePeasants();
    this.processSpecialTriggeredNPCs();
  }

  private processForeignRulers() {
    // 5.3 Foreign Rulers
    const currentDay = this.engine.clock.currentDay;
    const player = Object.values(this.engine.characters).find(c => c.isPlayer);
    if (!player) return;

    const rEexpansionist = this.engine.characters['foreign_expansionist'];
    const rIsolationist = this.engine.characters['foreign_isolationist'];
    const rCrusader = this.engine.characters['foreign_holy_crusader'];
    const rSchemer = this.engine.characters['foreign_schemer'];
    const rMercantile = this.engine.characters['foreign_mercantile'];
    const rBarbarian = this.engine.characters['foreign_barbarian'];
    const rRebel = this.engine.characters['foreign_vassal_rebel'];
    const rPuppet = this.engine.characters['foreign_puppet'];

    // Expansionist King Actions
    if (rEexpansionist && rEexpansionist.isAlive) {
      if (this.engine.rng.next() < 0.15) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `King Ethelred (Expansionist King) is aggressively raising mercenary bands on your periphery.`,
          'URGENT'
        );
        rEexpansionist.goldHoldings = Math.max(0, rEexpansionist.goldHoldings - 200);
      }
    }

    // Isolationist Actions
    if (rIsolationist && rIsolationist.isAlive) {
      if (this.engine.rng.next() < 0.10) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Earl Bernard (The Isolationist) fortified his border towers, hardening regional defense lines.`,
          'NORMAL'
        );
      }
    }

    // Holy Crusader Actions
    if (rCrusader && rCrusader.isAlive) {
      if (player.piety < 20 && this.engine.rng.next() < 0.12) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Duke Bohemond (The Holy Crusader) warns you that your faithless ruling style risks Holy denunciation.`,
          'URGENT'
        );
        rCrusader.opinion[player.id] = Math.max(-100, rCrusader.opinion[player.id] - 5);
      }
    }

    // Schemer Queen Actions
    if (rSchemer && rSchemer.isAlive) {
      if (this.engine.rng.next() < 0.15) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Duchess Matilda (The Schemer Queen) sent letters proposing a dynamic court marriage to your branch family.`,
          'NORMAL'
        );
      }
    }

    // Mercantile Republic Actions
    if (rMercantile && rMercantile.isAlive) {
      if (this.engine.rng.next() < 0.20 && this.engine.treasury.goldBalance < 1000) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Doge Alvise (The Mercantile Republic) offers a sovereign bridge loan of 400 gold at low interest.`,
          'NORMAL'
        );
      }
    }

    // Barbarian Chieftain Actions
    if (rBarbarian && rBarbarian.isAlive) {
      if (this.engine.rng.next() < 0.15) {
        const stolenGold = 120;
        if (this.engine.treasury.goldBalance >= stolenGold) {
          this.engine.treasury.goldBalance -= stolenGold;
          this.engine.chronicleSystem.add(
            this.engine.clock.currentYear,
            currentDay,
            `Chieftain Ragnar (The Barbarian Chieftain) launched a swift coastal raid, pillaging ${stolenGold} gold.`,
            'CRITICAL'
          );
        }
      }
    }

    // vassal rebel Actions
    if (rRebel && rRebel.isAlive) {
      if (this.engine.rng.next() < 0.10) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Count Robert (Vassal Rebel King) seeks a defensive pact against foreign empires.`,
          'NORMAL'
        );
      }
    }
  }

  private processCouncilAdvisors() {
    // 5.4 Court Advisors
    const currentDay = this.engine.clock.currentDay;
    const player = Object.values(this.engine.characters).find(c => c.isPlayer);
    if (!player) return;

    const chancellor = this.engine.characters['advisor_chancellor'];
    const marshal = this.engine.characters['advisor_marshal'];
    const spymaster = this.engine.characters['advisor_spymaster'];
    const treasurer = this.engine.characters['advisor_treasurer'];
    const priest = this.engine.characters['advisor_priest'];

    // Chancellor Operations
    if (chancellor && chancellor.isAlive) {
      Object.values(this.engine.characters).forEach(c => {
        if (!c.isPlayer && c.opinion && c.opinion[player.id] !== undefined) {
          c.opinion[player.id] = Math.min(100, c.opinion[player.id] + Math.floor(chancellor.diplomacy / 4));
        }
      });
      if (currentDay % 90 === 0) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Chancellor Lord Vane conducts diplomatic tours, steadily improving foreign sovereign goodwill.`,
          'NORMAL'
        );
      }
    }

    // Marshal Operations
    if (marshal && marshal.isAlive) {
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        currentDay,
        `Marshal Sir Kaelen completes military drills, adding 45 recruits into standby town levies.`,
        'NORMAL'
      );
    }

    // Spymaster Operations
    if (spymaster && spymaster.isAlive) {
      if (this.engine.rng.next() < 0.20) {
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `Spymaster Silas watches court corridors, reducing rebellious faction organizational strength.`,
          'NORMAL'
        );
        Object.values(this.engine.factions).forEach(f => {
          f.strength = Math.max(0, f.strength - 4);
        });
      }
    }

    // Treasurer / Coin Advisor Operations
    if (treasurer && treasurer.isAlive) {
      const surplus = treasurer.stewardship * 5;
      this.engine.treasury.goldBalance += surplus;

      if (this.engine.rng.next() < 0.25) {
        // Greedy Treasurer embezzling
        const embezzled = treasurer.stewardship * 6;
        if (this.engine.treasury.goldBalance >= embezzled) {
          this.engine.treasury.goldBalance -= embezzled;
          treasurer.goldHoldings += embezzled;
          this.engine.chronicleSystem.add(
            this.engine.clock.currentYear,
            currentDay,
            `Spies report Master Thade diverted ${embezzled} gold of municipal trade revenues to private coffers!`,
            'NORMAL'
          );
        }
      }
    }

    // Priest / Religion Advisor Operations
    if (priest && priest.isAlive) {
      player.piety = (player.piety || 0) + Math.floor(priest.learning / 3);
      if (player.piety < 15) {
        this.engine.alertSystem.queueAlert(
          `Father Martin warns: Your piety (${player.piety}) is dangerously low! The clergy contemplates excommunication.`,
          'URGENT'
        );
      }
    }
  }

  private processHeirsAndFamily() {
    // 5.5 Heirs & Family Members
    const currentDay = this.engine.clock.currentDay;
    const player = Object.values(this.engine.characters).find(c => c.isPlayer);
    const spouse = this.engine.characters['spouse_player'];
    const heir = this.engine.characters['heir_player'];

    if (spouse && spouse.isAlive && currentDay % 120 === 0) {
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        currentDay,
        `${spouse.firstName} successfully acts as sovereign-consort, resolving crown litigation.`,
        'FLAVOR'
      );
    }

    if (heir && heir.isAlive) {
      if (heir.age < 15) {
        heir.age++;
        if (heir.age >= 13) {
          // Educated Milestone: chooses custom path (e.g., STATECRAFT)
          heir.diplomacy += 4;
          heir.stewardship += 3;
          this.engine.chronicleSystem.add(
            this.engine.clock.currentYear,
            currentDay,
            `${heir.firstName} has matured under STATECRAFT study. Gains Statecraft competence.`,
            'NORMAL'
          );
        }
      }
    }
  }

  private processClergyNPCs() {
    // 5.6 Clergy NPCs
    const currentDay = this.engine.clock.currentDay;
    const highPriest = this.engine.characters['clergy_high_priest'];
    const player = Object.values(this.engine.characters).find(c => c.isPlayer);
    if (!player) return;

    if (highPriest && highPriest.isAlive) {
      if (player.piety < 10) {
        // Excommunication trigger!
        this.engine.alertSystem.queueAlert(
          `EXCOMMUNICATED! High Priest Benedictus has excommunicated you for insufficient piety!`,
          'CRITICAL'
        );
        this.engine.chronicleSystem.add(
          this.engine.clock.currentYear,
          currentDay,
          `High Priest Benedictus excommunicates sovereign line. Vassal relations collapse.`,
          'CRITICAL'
        );
        // Decrease relations
        Object.values(this.engine.characters).forEach(v => {
          if (!v.isPlayer && v.opinion) {
            v.opinion[player.id] = Math.max(-100, (v.opinion[player.id] || 0) - 30);
          }
        });
      } else if (this.engine.rng.next() < 0.15) {
        // Tithe demand
        const cost = 150;
        if (this.engine.treasury.goldBalance >= cost) {
          this.engine.treasury.goldBalance -= cost;
          player.piety += 30;
          this.engine.chronicleSystem.add(
            this.engine.clock.currentYear,
            currentDay,
            `High Priest Benedictus holds holy convocation, demanding a ${cost} gold donation towards church restoration.`,
            'NORMAL'
          );
        }
      }
    }
  }

  private processMerchantGuildNPCs() {
    // 5.7 Merchant & Guild NPCs
    const currentDay = this.engine.clock.currentDay;
    const guildMaster = this.engine.characters['npc_guild_master'];
    const banker = this.engine.characters['npc_banker'];

    if (guildMaster && guildMaster.isAlive && this.engine.rng.next() < 0.15) {
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        currentDay,
        `Guild Master Thomas demands structural trade monopolies, pledging high city improvements.`,
        'NORMAL'
      );
    }

    if (banker && banker.isAlive && this.engine.treasury.goldBalance < 100) {
      // Offer bailout loan
      const loanAmount = 1000;
      this.engine.treasury.goldBalance += loanAmount;
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        currentDay,
        `Master Banker Solomon provides a critical treasury bail-out loan of ${loanAmount} gold.`,
        'URGENT'
      );
    }
  }

  private processMilitaryNPCs() {
    // 5.8 Military NPCs
    const currentDay = this.engine.clock.currentDay;
    const general = this.engine.characters['npc_general'];
    const captain = this.engine.characters['npc_mercenary_captain'];
    const bandit = this.engine.characters['npc_bandit_chief'];

    if (general && general.isAlive && this.engine.rng.next() < 0.10) {
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        currentDay,
        `General James autonomously adjusts peripheral garrison watch schedules.`,
        'FLAVOR'
      );
    }

    if (captain && captain.isAlive && this.engine.rng.next() < 0.08) {
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        currentDay,
        `Captain Hawkwood drills his formidable heavy forces, awaiting contracts.`,
        'FLAVOR'
      );
    }

    if (bandit && bandit.isAlive && this.engine.rng.next() < 0.12) {
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        currentDay,
        `Robin of the Outlaws raided regional supply convoys, stealing 40 crop units.`,
        'NORMAL'
      );
    }
  }

  private processAggregatePeasants() {
    // 5.9 Peasant-Level NPCs (Aggregate Simulation)
    const currentDay = this.engine.clock.currentDay;
    if (this.engine.rng.next() < 0.15) {
      const emergentNarratives = [
        "A blacksmith with a deep grudge has emerged in Sarn, inciting rural laborers against work quotas.",
        "A plague doctor has arrived in the local market center, testing suspicious herbs.",
        "An eccentric prophet has begun preaching in the woodlands, rallying peasants against the nobility."
      ];
      const selected = emergentNarratives[Math.floor(this.engine.rng.next() * emergentNarratives.length)];
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        currentDay,
        selected,
        'FLAVOR'
      );
    }
  }

  private processSpecialTriggeredNPCs() {
    // 5.10 Special Event NPCs (Triggered Characters)
    const currentDay = this.engine.clock.currentDay;
    if (this.engine.rng.next() < 0.12) {
      const courtWanderers = [
        "A Wandering Knight has arrived at court offering his massive sword in service of your banners.",
        "The Foreign Ambassador arrives with precise alliance terms from their remote kingdom.",
        "An Exiled Heir arrives seeking shelter from his conquerors, bringing long-dead claims.",
        "The Court Jester tells a peculiar riddle detailing clandestine troop movements over the valley.",
        "A mysterious, travel-worn pilgrim arrives seeking shelter at the lower gate."
      ];
      const selected = courtWanderers[Math.floor(this.engine.rng.next() * courtWanderers.length)];
      this.engine.chronicleSystem.add(
        this.engine.clock.currentYear,
        currentDay,
        selected,
        'NORMAL'
      );
    }
  }
}

