import {MemoryStore} from './support/memory.mjs';
import {salesSuite} from './support/sales-suite.mjs';
salesSuite(()=>new MemoryStore());
