import {MemoryStore} from './support/memory.mjs';
import {groupsSuite} from './support/groups-suite.mjs';
groupsSuite(()=>new MemoryStore());
