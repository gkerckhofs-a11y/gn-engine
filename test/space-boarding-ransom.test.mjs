import {boardingRansomSuite} from './support/space-boarding-ransom-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
boardingRansomSuite(()=>new MemoryStore());
