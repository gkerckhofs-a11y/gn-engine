import {spaceEpisodesSuite} from './support/space-episodes-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceEpisodesSuite(()=>new MemoryStore());
