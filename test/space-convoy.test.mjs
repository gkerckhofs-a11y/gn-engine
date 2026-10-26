import {spaceConvoySuite} from './support/space-convoy-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceConvoySuite(()=>new MemoryStore());
