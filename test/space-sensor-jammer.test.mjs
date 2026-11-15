import {MemoryStore} from './support/memory.mjs';
import {sensorJammerSuite} from './support/space-sensor-jammer-suite.mjs';
sensorJammerSuite(()=>new MemoryStore());
