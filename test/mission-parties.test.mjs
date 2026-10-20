import {MemoryStore} from './support/memory.mjs';
import {missionPartiesSuite} from './support/mission-parties-suite.mjs';
missionPartiesSuite(()=>new MemoryStore());
