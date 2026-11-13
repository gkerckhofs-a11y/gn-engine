import {MemoryStore} from './support/memory.mjs';import {sabaccSuite} from './support/sabacc-suite.mjs';sabaccSuite(()=>new MemoryStore());
import {sabaccGnSuite} from './support/sabacc-suite.mjs';sabaccGnSuite(()=>new MemoryStore());
