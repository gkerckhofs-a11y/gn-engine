import {centralCheckSuite} from './support/central-check-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralCheckSuite(()=>new MemoryStore());
