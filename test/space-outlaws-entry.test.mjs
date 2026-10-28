import {spaceOutlawsEntrySuite} from './support/space-outlaws-entry-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceOutlawsEntrySuite(()=>new MemoryStore());
