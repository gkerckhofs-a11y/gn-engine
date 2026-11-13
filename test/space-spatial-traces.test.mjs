import {MemoryStore} from './support/memory.mjs';
import {spatialTracesSuite} from './support/space-spatial-traces-suite.mjs';
spatialTracesSuite(()=>new MemoryStore());
