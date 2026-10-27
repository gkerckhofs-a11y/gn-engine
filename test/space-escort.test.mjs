import {spaceEscortSuite} from './support/space-escort-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceEscortSuite(()=>new MemoryStore());
