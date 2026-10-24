import {centralRecipesSuite} from './support/central-recipes-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralRecipesSuite(()=>new MemoryStore());
