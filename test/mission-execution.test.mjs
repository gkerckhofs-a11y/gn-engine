import {missionExecutionSuite} from './support/mission-execution-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
missionExecutionSuite(()=>new MemoryStore());
