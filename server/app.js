const Koa = require('koa');

const bodyParser = require('koa-bodyparser');

const controller = require('./controller');
const cors = require('koa2-cors');

const app = new Koa();

const model = require('./model');

const obj = {
    formid: 0,
    formName: '222',
    rows: 2,
    labels: [{
        cols: 4,
        fields: [{
            fieldType: 'text',
            key: 'nickname',
            value: '默认名称',
            maxNme: 100,
        }, {
            fieldType: 'select',
            length: 1,
            key: 'citys',
            options: [{
                key: 'option1',
                value: '默认选项1',
            }]
        }, {}, {}]
    }, {}]
};

let
    Pet = model.Pet,
    User = model.User;

(async () => {
    var user = await User.create({
        name: 'John',
        gender: false,
        email: 'john-' + Date.now() + '@garfield.pet',
        passwd: 'hahaha'
    });
    console.log('created: ' + JSON.stringify(user));
    var cat = await Pet.create({
        ownerId: user.id,
        name: 'Garfield',
        gender: false,
        birth: '2007-07-07',
    });
    console.log('created: ' + JSON.stringify(cat));
    var dog = await Pet.create({
        ownerId: user.id,
        name: 'Odie',
        gender: false,
        birth: '2008-08-08',
    });
    console.log('created: ' + JSON.stringify(dog));
})();


// cors 跨域
app.use(cors({
    origin: function () {
        return 'http://localhost:9998';
    },
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 5,
    credentials: true,
    allowMethods: ['GET', 'POST', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));


// log request URL:
app.use(async (ctx, next) => {
    console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
    await next();
});

// parse request body:
app.use(bodyParser());

// add controllers:
app.use(controller());

app.listen(3000);
console.log('app started at port 3000...');
