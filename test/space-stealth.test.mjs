import {spaceStealthSuite} from './support/space-stealth-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceStealthSuite(()=>new MemoryStore());
