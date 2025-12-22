import { API } from '../services/oniri-core/src/index.js';
console.log(API)

import dayjs from 'dayjs'

function test() {
    console.log("test",dayjs().format())
}

export {test }