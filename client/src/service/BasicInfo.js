import CommonService from './CommonService';
import { Remote } from '../util';

class BasicInfo extends CommonService {
    getList(uid) {
        return Remote.get('/list', { uid }).then((res) => {
            return res;
        });
    }
}

export default new BasicInfo();
