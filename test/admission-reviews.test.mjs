import {admissionReviewsSuite} from './support/admission-reviews-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
admissionReviewsSuite(()=>new MemoryStore());
