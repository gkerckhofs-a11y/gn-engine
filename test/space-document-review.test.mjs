import {spaceDocumentReviewSuite} from './support/space-document-review-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceDocumentReviewSuite(()=>new MemoryStore());
