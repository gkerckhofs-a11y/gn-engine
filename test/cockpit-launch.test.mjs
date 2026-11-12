import {MemoryStore} from './support/memory.mjs';
import {cockpitLaunchSuite} from './support/cockpit-launch-suite.mjs';
cockpitLaunchSuite(()=>new MemoryStore());
