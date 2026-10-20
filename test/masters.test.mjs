import {mastersSuite} from './support/masters-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
mastersSuite(()=>new MemoryStore());
