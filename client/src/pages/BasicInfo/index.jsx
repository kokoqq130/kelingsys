/**
 * @Description:
 * @author kokoqq130
 * @date 2019/3/4
*/
import React from 'react';
import View from '@View';
import { Button } from 'antd';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

class BasicInfo extends View {
    static propTypes = {
        asyncGetList: PropTypes.func,
        list: PropTypes.array,
    };

    static defaultProps = {
        asyncGetList: () => {},
        list: [],
    };

    render() {
        const { asyncGetList, list } = this.props;
        return (<div>
            测试首页，啥都没
            <Button
                onClick={() => {
                    asyncGetList();
                }}
            >
                点击
            </Button>
            {
                list.map((item) => {
                    return <li>{item.key}</li>;
                })
            }
        </div>);
    }
}

const mapState = (state) => {
    console.info(state);
    return {
        list: state.basicInfo.list,
    };
};

const mapDispatch = (dispatch) => {
    return {
        asyncGetList: () => {
            return dispatch.basicInfo.asyncGetList(1);
        },
    };
};

export default connect(mapState, mapDispatch)(BasicInfo);
