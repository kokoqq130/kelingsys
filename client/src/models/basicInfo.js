import BasicInfo from '../service/BasicInfo';


export const basicInfo = {
    state: {
        list: [],
    },
    reducers: {
        getList(state, list) {
            return {
                ...state,
                list,
            };
        },
    },
    effects: {
        async asyncGetList(uid) {
            const data = await BasicInfo.getList(uid);
            this.getList(data.list);
        },
    },
};
