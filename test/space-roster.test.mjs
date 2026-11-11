import {MemoryStore} from './support/memory.mjs';
import {spaceRosterSuite} from './support/space-roster-suite.mjs';
spaceRosterSuite(()=>new MemoryStore());
