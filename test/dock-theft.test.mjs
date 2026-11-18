import {MemoryStore} from './support/memory.mjs';
import {dockTheftSuite} from './support/dock-theft-suite.mjs';
dockTheftSuite(()=>new MemoryStore());
