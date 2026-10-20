import {MemoryStore} from './support/memory.mjs';
import {contractsSuite} from './support/contracts-suite.mjs';
contractsSuite(()=>new MemoryStore());
