import {spaceEscortManeuversSuite} from './support/space-escort-maneuvers-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceEscortManeuversSuite(()=>new MemoryStore());
