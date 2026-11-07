import {fleetBoardingSuite} from './support/space-fleet-boarding-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
fleetBoardingSuite(()=>new MemoryStore());
