import {MemoryStore} from './support/memory.mjs';
import {centralFieldTargetsSuite} from './support/central-field-targets-suite.mjs';
centralFieldTargetsSuite(()=>new MemoryStore());
