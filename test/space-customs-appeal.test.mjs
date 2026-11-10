import {customsAppealSuite} from './support/space-customs-appeal-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
customsAppealSuite(()=>new MemoryStore());
