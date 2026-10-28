import {centralStoryImportSuite} from './support/central-story-import-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralStoryImportSuite(()=>new MemoryStore());
