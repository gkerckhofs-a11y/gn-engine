import {centralCharactersSuite} from './support/central-characters-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralCharactersSuite(()=>new MemoryStore());
