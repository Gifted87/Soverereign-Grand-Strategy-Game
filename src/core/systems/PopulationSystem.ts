import type { GameLoop } from '../engine/GameLoop';

export class PopulationSystem {
  constructor(private engine: GameLoop) {}
  
  tick() {
    // Demographic shifts occur every 30 days
    if (this.engine.clock.currentDay % 30 === 0) {
      Object.values(this.engine.provinces).forEach(province => {
        // Growth calculation
        let growthRate = 1.005; // Base +0.5% a month
        growthRate += (province.fertility / 2000); // Up to +0.05%
        
        if (province.disease) growthRate -= 0.02; // -2% if diseased
        if (province.isBesieged) growthRate -= 0.05; // -5% if besieged

        province.population.total = Math.floor(province.population.total * growthRate);
        
        // Adjust sub-populations proportionally based on continent-specific urbanization profiles
        const cont = province.continent || 'Aurelia';
        let rSerfs = 0.85;
        let rMerchants = 0.10;
        let rClergy = 0.03;
        let rNobles = 0.02;

        if (cont === 'Vareth') {
          // Base 18% Urbanization, customized by climate and topography
          if (province.name.includes('Solmere')) {
            // Highly urban Mediterranean south
            rSerfs = 0.76;
            rMerchants = 0.19;
            rClergy = 0.03;
            rNobles = 0.02;
          } else if (province.name.includes('Rhakar')) {
            // Volcanic hazard slopes - fewer wealthy classes
            rSerfs = 0.88;
            rMerchants = 0.08;
            rClergy = 0.03;
            rNobles = 0.01;
          } else if (province.name.includes('Kareth')) {
            // Polar maritime trade hubs
            rSerfs = 0.82;
            rMerchants = 0.14;
            rClergy = 0.02;
            rNobles = 0.02;
          } else {
            // Steppes & Alpine mountain folds
            rSerfs = 0.84;
            rMerchants = 0.12;
            rClergy = 0.02;
            rNobles = 0.02;
          }
        } else if (cont === 'Nythara') {
          // Base 20% Urbanization, customized by coastal trade density
          if (province.name.includes('Talassar')) {
            // High-density maritime trade metropolis along Sapphire Coast
            rSerfs = 0.70;
            rMerchants = 0.23;
            rClergy = 0.04;
            rNobles = 0.03;
          } else if (province.name.includes('Orun')) {
            // Alluvial agricultural basin supporting large arable populations
            rSerfs = 0.83;
            rMerchants = 0.12;
            rClergy = 0.03;
            rNobles = 0.02;
          } else if (province.name.includes('Compact')) {
            // Maritime archipelago guilds & shipyards
            rSerfs = 0.74;
            rMerchants = 0.22;
            rClergy = 0.02;
            rNobles = 0.02;
          } else {
            rSerfs = 0.81;
            rMerchants = 0.14;
            rClergy = 0.03;
            rNobles = 0.02;
          }
        }

        province.population.serfs = Math.floor(province.population.total * rSerfs);
        province.population.merchants = Math.floor(province.population.total * rMerchants);
        province.population.clergy = Math.floor(province.population.total * rClergy);
        province.population.nobles = Math.floor(province.population.total * rNobles);

        // Loyalty/Unrest modifiers
        if (province.disease) {
            province.loyalty = Math.max(0, province.loyalty - 1);
        }
      });
    }
  }
}
