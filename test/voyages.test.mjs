import {MemoryStore} from './support/memory.mjs';
import {voyagesSuite} from './support/voyages-suite.mjs';
voyagesSuite(()=>new MemoryStore());
