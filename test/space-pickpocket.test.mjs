import {soPickpocketSuite} from './support/space-pickpocket-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
soPickpocketSuite(()=>new MemoryStore());
