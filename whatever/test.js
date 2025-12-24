import { API } from '../services/oniri-core/src/api.js';
console.log(API)

import dayjs from 'dayjs'

function test() {
    console.log("test",dayjs().format())
}

export {test }