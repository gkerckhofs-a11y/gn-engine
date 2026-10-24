import {centralCharacterImportSuite} from './support/central-character-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralCharacterImportSuite(()=>new MemoryStore());
