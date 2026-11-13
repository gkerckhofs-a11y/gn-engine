import {MemoryStore} from './support/memory.mjs';
import {fictionalTracesSuite} from './support/space-fictional-traces-suite.mjs';
fictionalTracesSuite(()=>new MemoryStore());
