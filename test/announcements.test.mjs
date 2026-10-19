import {MemoryStore} from './support/memory.mjs';
import {announcementsSuite} from './support/announcements-suite.mjs';
announcementsSuite(()=>new MemoryStore());
