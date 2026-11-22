import {MemoryStore} from './support/memory.mjs';
import {starfighterNavigationSuite} from './support/starfighter-navigation-suite.mjs';
starfighterNavigationSuite(()=>new MemoryStore());
