import {spaceOutlawsActionsSuite} from './support/space-outlaws-actions-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceOutlawsActionsSuite(()=>new MemoryStore());
