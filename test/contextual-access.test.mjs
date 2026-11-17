import {MemoryStore} from './support/memory.mjs';
import {contextualAccessSuite} from './support/contextual-access-suite.mjs';
contextualAccessSuite(()=>new MemoryStore());
