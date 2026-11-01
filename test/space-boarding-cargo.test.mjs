import {boardingCargoSuite} from './support/space-boarding-cargo-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
boardingCargoSuite(()=>new MemoryStore());
