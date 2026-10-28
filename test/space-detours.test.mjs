import {spaceDetoursSuite} from './support/space-detours-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceDetoursSuite(()=>new MemoryStore());
