import {crewCargoSuite} from './support/ship-crew-cargo-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
crewCargoSuite(()=>new MemoryStore());
