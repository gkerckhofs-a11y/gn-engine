import {MemoryStore} from './support/memory.mjs';
import {commercialTransportSuite} from './support/commercial-transport-suite.mjs';
commercialTransportSuite(()=>new MemoryStore());
