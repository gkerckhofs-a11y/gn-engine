import {MemoryStore} from './support/memory.mjs';
import {commercialLogisticsSuite} from './support/commercial-logistics-suite.mjs';
commercialLogisticsSuite(()=>new MemoryStore());
