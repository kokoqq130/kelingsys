const Koa = require('koa');

const bodyParser = require('koa-bodyparser');

const controller = require('./controller');
const cors = require('koa2-cors');

const app = new Koa();

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
