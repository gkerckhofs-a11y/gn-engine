import {MemoryStore} from './support/memory.mjs';
import {spaceGroupPilotSuite} from './support/space-group-pilot-suite.mjs';
spaceGroupPilotSuite(()=>new MemoryStore());
