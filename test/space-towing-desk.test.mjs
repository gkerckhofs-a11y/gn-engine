import {MemoryStore} from './support/memory.mjs';
import {towingDeskSuite} from './support/space-towing-desk-suite.mjs';
towingDeskSuite(()=>new MemoryStore());
