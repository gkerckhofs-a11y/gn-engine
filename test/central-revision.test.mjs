import {centralRevisionSuite} from './support/central-revision-suite.mjs';
import {MemoryStore} from './support/memory.mjs';

centralRevisionSuite(()=>new MemoryStore());
