import {spaceRouteAnalysisSuite} from './support/space-route-analysis-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceRouteAnalysisSuite(()=>new MemoryStore());
