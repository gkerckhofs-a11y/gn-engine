import {MemoryStore} from './support/memory.mjs';
import {customsSuite} from './support/customs-suite.mjs';
customsSuite(()=>new MemoryStore());
