import {fieldSuite} from './support/field-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
fieldSuite(()=>new MemoryStore());
