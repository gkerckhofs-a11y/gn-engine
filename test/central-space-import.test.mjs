import {centralSpaceImportSuite} from './support/central-space-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralSpaceImportSuite(()=>new MemoryStore());
