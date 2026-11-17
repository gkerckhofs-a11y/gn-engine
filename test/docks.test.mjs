import {MemoryStore} from './support/memory.mjs';
import {docksSuite} from './support/docks-suite.mjs';
docksSuite(()=>new MemoryStore());
import {dockIntrusionSuite} from './support/docks-suite.mjs';
dockIntrusionSuite(()=>new MemoryStore());
