import {shipNamesSuite} from './support/space-ship-names-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
shipNamesSuite(()=>new MemoryStore());
