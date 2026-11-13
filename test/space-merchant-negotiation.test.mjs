import {merchantNegotiationSuite} from './support/space-merchant-negotiation-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
merchantNegotiationSuite(()=>new MemoryStore());
