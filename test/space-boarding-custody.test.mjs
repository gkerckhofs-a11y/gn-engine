import {boardingCustodySuite} from './support/space-boarding-custody-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
boardingCustodySuite(()=>new MemoryStore());
