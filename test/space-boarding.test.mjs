import {spaceBoardingSuite} from './support/space-boarding-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceBoardingSuite(()=>new MemoryStore());
