import {spaceLogisticsSuite} from './support/space-logistics-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceLogisticsSuite(()=>new MemoryStore());
