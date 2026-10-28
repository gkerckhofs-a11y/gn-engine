import {admissionM2Suite} from './support/admission-m2-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
admissionM2Suite(()=>new MemoryStore());
