import {MemoryStore} from './support/memory.mjs';
import {sensorFabricationSuite} from './support/space-sensor-fabrication-suite.mjs';
sensorFabricationSuite(()=>new MemoryStore());
