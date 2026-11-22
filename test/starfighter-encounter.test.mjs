import {MemoryStore} from './support/memory.mjs';
import {starfighterEncounterSuite} from './support/starfighter-encounter-suite.mjs';
starfighterEncounterSuite(()=>new MemoryStore());
