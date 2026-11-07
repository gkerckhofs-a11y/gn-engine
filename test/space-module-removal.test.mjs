import {moduleRemovalSuite} from './support/space-module-removal-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
moduleRemovalSuite(()=>new MemoryStore());
