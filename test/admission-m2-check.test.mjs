import {admissionM2CheckSuite} from './support/admission-m2-check-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
admissionM2CheckSuite(()=>new MemoryStore());
