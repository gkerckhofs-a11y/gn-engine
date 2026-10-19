import {MemoryStore} from './support/memory.mjs';
import {economySuite} from './support/economy-suite.mjs';
economySuite(()=>new MemoryStore());
