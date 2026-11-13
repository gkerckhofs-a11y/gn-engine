import {merchantContactsSuite} from './support/space-merchant-contacts-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
merchantContactsSuite(()=>new MemoryStore());
