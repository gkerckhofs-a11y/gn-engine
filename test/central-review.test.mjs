import {centralReviewSuite} from './support/central-review-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralReviewSuite(()=>new MemoryStore());
