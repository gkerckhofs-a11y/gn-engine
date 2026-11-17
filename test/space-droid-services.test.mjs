import {MemoryStore} from './support/memory.mjs';
import {droidServiceSuite} from './support/space-droid-services-suite.mjs';
droidServiceSuite(()=>new MemoryStore());
