import {centralImportSuite} from './support/central-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralImportSuite(()=>new MemoryStore());
