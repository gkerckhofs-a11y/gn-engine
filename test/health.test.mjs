import {MemoryStore} from './support/memory.mjs';
import {healthSuite} from './support/health-suite.mjs';
healthSuite(()=>new MemoryStore());
