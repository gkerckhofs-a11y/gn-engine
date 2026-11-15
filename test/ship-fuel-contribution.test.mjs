import {shipFuelContributionSuite} from './support/ship-fuel-contribution-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
shipFuelContributionSuite(()=>new MemoryStore());
