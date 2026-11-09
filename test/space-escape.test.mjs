import {soEscapeSuite} from './support/space-escape-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
soEscapeSuite(()=>new MemoryStore());
