var fn_list = async (ctx, next) => {
    ctx.response.body = {
        list: [{key: '测试'}, {key: '测试'}],
        code: 0,
        msg: '成功',
    };
};

module.exports = {
    'GET /list': fn_list
};
