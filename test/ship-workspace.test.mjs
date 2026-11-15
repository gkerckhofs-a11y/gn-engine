import {shipWorkspaceSuite} from './support/ship-workspace-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
shipWorkspaceSuite(()=>new MemoryStore());
