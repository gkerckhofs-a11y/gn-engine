import {personSuite} from './support/person-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
personSuite(()=>new MemoryStore());
