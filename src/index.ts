import figlet from 'figlet';
import {MegaverseAPI} from './megaverse.js';
import {Command} from '@commander-js/extra-typings';

// Create an instance of MegaverseAPI
const api = new MegaverseAPI();

console.log(figlet.textSync('Crossmint   MegaVerse'));

const program = new Command()
  .version('1.0.0')
  .description('Astral Map Explorer: Navigate and Achieve Celestial Goals.')
  .option('-m, --showmap', 'Show my Map')
  .option('-g, --showgoal', 'Show my Map')
  .option('-p1, --phase1', 'Phase 1 Solution')
  .option('-p2, --phase2', 'Phase 2 Solution')
  .option('-v, --validate', 'Validate')
  .option('-r, --reset', 'Reset')
  .option('-d, --diff', 'Difference')
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
  //console.log('Goal Map from Main: ', map);
  api.showGoal(map);
}

if (options.diff) {
  //console.log("DIFFERENCEs:",differences);
  // If you want to print the differences
  //differences.forEach(diff => console.log(diff));

  api.processMapEntities();
}

if (options.reset) {
  await api.reset();
}

if (options.phase1) {
  const map = await api.getGoal();
  //api.postPolyanets(map);
}

if (options.phase2) {
  const map = await api.getGoal();
  //api.processMapEntities(map);
}

if (options.validate) {
  api.validate();
}

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
