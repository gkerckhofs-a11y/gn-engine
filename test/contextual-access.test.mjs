import {MemoryStore} from './support/memory.mjs';
import {contextualAccessSuite} from './support/contextual-access-suite.mjs';
contextualAccessSuite(()=>new MemoryStore());
import {contextualCredentialsSuite} from './support/contextual-access-suite.mjs';
contextualCredentialsSuite(()=>new MemoryStore());
