import {MemoryStore} from './support/memory.mjs';
import {planetMarketsSuite} from './support/planet-markets-suite.mjs';
planetMarketsSuite(()=>new MemoryStore());
