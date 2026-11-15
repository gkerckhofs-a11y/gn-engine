import {mechanicalProtectionSuite} from './support/space-mechanical-protection-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
mechanicalProtectionSuite(()=>new MemoryStore());
