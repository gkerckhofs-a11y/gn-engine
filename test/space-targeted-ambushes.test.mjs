import {targetedAmbushSuite} from './support/space-targeted-ambushes-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
targetedAmbushSuite(()=>new MemoryStore());
