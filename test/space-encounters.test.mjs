import {spaceEncountersSuite} from './support/space-encounters-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceEncountersSuite(()=>new MemoryStore());
