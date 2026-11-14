import {medicalDiagnosisSuite} from './support/space-medical-diagnosis-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
medicalDiagnosisSuite(()=>new MemoryStore());
