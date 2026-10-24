import {centralMasterSuite} from './support/central-master-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralMasterSuite(()=>new MemoryStore());
