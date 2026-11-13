import {clinicSuite,workshopSuite} from './support/space-clinic-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
clinicSuite(()=>new MemoryStore());
workshopSuite(()=>new MemoryStore());
