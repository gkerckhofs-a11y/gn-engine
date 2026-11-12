import {identityNewsHealthSuite} from './support/identity-news-health-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
identityNewsHealthSuite(()=>new MemoryStore());
