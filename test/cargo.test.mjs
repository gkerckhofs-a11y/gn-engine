import {MemoryStore} from './support/memory.mjs';
import {cargoSuite} from './support/cargo-suite.mjs';
cargoSuite(()=>new MemoryStore());
