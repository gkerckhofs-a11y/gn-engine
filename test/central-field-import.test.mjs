import {MemoryStore} from './support/memory.mjs';
import {centralFieldImportSuite} from './support/central-field-import-suite.mjs';
centralFieldImportSuite(()=>new MemoryStore());
