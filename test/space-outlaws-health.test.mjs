import {spaceOutlawsHealthSuite} from './support/space-outlaws-health-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceOutlawsHealthSuite(()=>new MemoryStore());
