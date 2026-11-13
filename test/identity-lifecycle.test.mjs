import {MemoryStore} from './support/memory.mjs';
import {identityLifecycleSuite} from './support/identity-lifecycle-suite.mjs';
identityLifecycleSuite(()=>new MemoryStore());
