import {spaceOutlawsVoyagesSuite} from './support/space-outlaws-voyages-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceOutlawsVoyagesSuite(()=>new MemoryStore());
