import {characterNatureSuite} from './support/character-nature-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
characterNatureSuite(()=>new MemoryStore());
