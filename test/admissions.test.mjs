import {admissionsSuite} from './support/admissions-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
admissionsSuite(()=>new MemoryStore());
