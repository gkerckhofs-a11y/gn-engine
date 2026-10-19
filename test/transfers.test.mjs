import {MemoryStore} from './support/memory.mjs';
import {transfersSuite} from './support/transfers-suite.mjs';
transfersSuite(()=>new MemoryStore());
