import {boardingShopReturnSuite} from './support/space-boarding-shop-return-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
boardingShopReturnSuite(()=>new MemoryStore());
