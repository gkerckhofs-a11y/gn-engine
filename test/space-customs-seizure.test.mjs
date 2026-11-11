import {customsSeizureSuite} from './support/space-customs-seizure-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
customsSeizureSuite(()=>new MemoryStore());
