import {MemoryStore} from './support/memory.mjs';
import {marketSuite} from './support/market-suite.mjs';
marketSuite(()=>new MemoryStore());
