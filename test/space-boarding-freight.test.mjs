import {boardingFreightSuite} from './support/space-boarding-freight-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
boardingFreightSuite(()=>new MemoryStore());
