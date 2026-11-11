import {technicalAnalysisSuite} from './support/space-technical-analysis-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
technicalAnalysisSuite(()=>new MemoryStore());
