import {preparationsSuite} from './support/preparations-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
preparationsSuite(()=>new MemoryStore());
