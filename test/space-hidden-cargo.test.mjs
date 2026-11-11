import {hiddenCargoSuite} from './support/space-hidden-cargo-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
hiddenCargoSuite(()=>new MemoryStore());
