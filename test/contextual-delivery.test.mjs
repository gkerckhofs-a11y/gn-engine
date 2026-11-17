import {MemoryStore} from './support/memory.mjs';
import {contextualDeliverySuite} from './support/contextual-delivery-suite.mjs';
contextualDeliverySuite(()=>new MemoryStore());
