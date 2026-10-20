import {campaignsSuite} from './support/campaigns-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
campaignsSuite(()=>new MemoryStore());
