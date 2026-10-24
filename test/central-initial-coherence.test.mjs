import {centralInitialCoherenceSuite} from './support/central-initial-coherence-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralInitialCoherenceSuite(()=>new MemoryStore());
