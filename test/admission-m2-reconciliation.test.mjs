import {admissionM2ReconciliationSuite} from './support/admission-m2-reconciliation-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
admissionM2ReconciliationSuite(()=>new MemoryStore());
