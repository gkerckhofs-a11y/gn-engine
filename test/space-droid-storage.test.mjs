import {MemoryStore} from './support/memory.mjs';
import {droidStorageSuite} from './support/space-droid-storage-suite.mjs';
droidStorageSuite(()=>new MemoryStore());
