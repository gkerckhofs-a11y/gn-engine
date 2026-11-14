import {MemoryStore} from './support/memory.mjs';
import {galacticMapSuite} from './support/galactic-map-suite.mjs';
galacticMapSuite(()=>new MemoryStore());
