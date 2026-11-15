import {MemoryStore} from './support/memory.mjs';
import {commercialStorageSuite} from './support/commercial-storage-suite.mjs';
commercialStorageSuite(()=>new MemoryStore());
