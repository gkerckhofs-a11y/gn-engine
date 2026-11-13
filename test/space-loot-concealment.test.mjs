import {lootConcealmentSuite} from './support/space-loot-concealment-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
lootConcealmentSuite(()=>new MemoryStore());
