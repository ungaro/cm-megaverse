
import figlet from 'figlet';

import { MegaverseAPI } from './megaverse.js';
import { Command } from '@commander-js/extra-typings';

async function main() {
    // Create an instance of MegaverseAPI
    const api = new MegaverseAPI();

    console.log(figlet.textSync('Crossmint MegaVerse'));

    const program = new Command()
      .version('1.0.0')
      .description('Astral Map Explorer: Navigate and Achieve Celestial Goals.')
      .option('-m, --showmap', 'Show my Map')
      .option('-g, --showgoal', 'Show my Goal Map')
      .option('-p1, --phase1', 'Phase 1 Solution')
      .option('-p2, --phase2', 'Phase 2 Solution')
      .option('-r, --reset', 'Reset')
      .parse(process.argv);

    const options = program.opts();

    function greetAstralTraveler() {
      console.log(`
🌌 Ahoy there, cosmic wanderer! 🌌

Ready to chart a course through the swirling nebulas and dance around black holes? 
So strap in, activate your thrusters, and let the universe be your guide. And hey, if you happen to find a shortcut past the asteroid belt, do let us know!

🚀 May your journey be as bright as a supernova and your adventures as thrilling as a comet tail! 🪐

Here is your Goal Map:
    `);
    }

    if (options.showmap) {
      greetAstralTraveler();
      const map = await api.getMap();
      api.showMap(map);
    }
    
    if (options.showgoal) {
      greetAstralTraveler();
      const map = await api.getGoal();
      api.showGoal(map);
    }
    

    if (options.reset) {
      await api.reset();
    }
    
    if (options.phase1) {
      api.phase1();
    }
    
    if (options.phase2) {
      api.phase2();
    }
    


    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }
}

main().catch(error => {
    console.error('An error occurred:', error);
    process.exit(1);
});
