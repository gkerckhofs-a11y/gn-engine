import {MemoryStore} from './support/memory.mjs';
import {galacticEconomySuite} from './support/galactic-economy-suite.mjs';
galacticEconomySuite(()=>new MemoryStore());
