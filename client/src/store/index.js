import { init } from '@rematch/core';
import { todos } from '../models/todos';
import { basicInfo } from '../models/basicInfo';

console.info(todos);

const store = init({
    models: {
        todos,
        basicInfo,
    },
});

export default store;
