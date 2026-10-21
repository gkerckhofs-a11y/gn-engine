import {MemoryStore} from './support/memory.mjs';
import {pricesSuite} from './support/prices-suite.mjs';
pricesSuite(()=>new MemoryStore());
