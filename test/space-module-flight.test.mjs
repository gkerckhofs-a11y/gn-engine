import {moduleFlightSuite} from './support/space-module-flight-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
moduleFlightSuite(()=>new MemoryStore());
