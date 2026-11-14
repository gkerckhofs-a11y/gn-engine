import {merchantAnalysisSuite} from './support/space-merchant-analysis-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
merchantAnalysisSuite(()=>new MemoryStore());
