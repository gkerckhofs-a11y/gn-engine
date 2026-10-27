import {MemoryStore} from './support/memory.mjs';
import {spaceEscortAmendmentsSuite} from './support/space-escort-amendments-suite.mjs';
spaceEscortAmendmentsSuite(()=>new MemoryStore());
