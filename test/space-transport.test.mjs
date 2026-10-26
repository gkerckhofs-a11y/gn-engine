import {spaceTransportSuite} from './support/space-transport-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceTransportSuite(()=>new MemoryStore());
