import {MemoryStore} from './support/memory.mjs';
import {droidWorkSuite} from './support/space-droid-work-suite.mjs';
droidWorkSuite(()=>new MemoryStore());
