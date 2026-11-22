import {MemoryStore} from './support/memory.mjs';
import {starfighterFleetSuite} from './support/starfighter-fleet-suite.mjs';
starfighterFleetSuite(()=>new MemoryStore());
