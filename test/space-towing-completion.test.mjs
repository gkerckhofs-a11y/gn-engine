import {MemoryStore} from './support/memory.mjs';
import {towingCompletionSuite} from './support/space-towing-completion-suite.mjs';
towingCompletionSuite(()=>new MemoryStore());
