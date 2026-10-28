import {spaceSuccessionSuite} from './support/space-succession-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceSuccessionSuite(()=>new MemoryStore());
