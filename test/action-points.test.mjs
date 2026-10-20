import {MemoryStore} from './support/memory.mjs';
import {actionPointsSuite} from './support/action-points-suite.mjs';
actionPointsSuite(()=>new MemoryStore());
