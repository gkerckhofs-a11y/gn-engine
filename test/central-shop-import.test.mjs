import {centralShopImportSuite} from './support/central-shop-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralShopImportSuite(()=>new MemoryStore());
