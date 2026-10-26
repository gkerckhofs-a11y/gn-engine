import {spaceLearningSuite} from './support/space-learning-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceLearningSuite(()=>new MemoryStore());
