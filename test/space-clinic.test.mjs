import {clinicSuite} from './support/space-clinic-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
clinicSuite(()=>new MemoryStore());
