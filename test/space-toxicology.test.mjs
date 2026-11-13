import {MemoryStore} from './support/memory.mjs';
import {spaceToxicologySuite,toxicologyLifecycleSuite} from './support/space-toxicology-suite.mjs';
spaceToxicologySuite(()=>new MemoryStore());
toxicologyLifecycleSuite(()=>new MemoryStore());
