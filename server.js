const express = require('express');
const connectDB = require('./config/db');
const logger = require('morgan');

const session = require('express-session');
const cookieparser = require('cookie-parser');

const app = express();
const path = require('path');

// Connect Database
connectDB();

// html 렌더링 설정
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

// Init Middleware
app.use(express.json({ extended: false }));
app.use(logger('dev'));

app.use(
  express.urlencoded({
    extended: false
  })
);

app.use(cookieparser());
app.use(
  session({
    key: 'sid',
    secret: '1A@W#E$R',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 500 * 60 * 60
    }
    // key: 세션의 키 값
    // secret: 세션의 비밀 키, 쿠키값의 변조를 막기 위해서 이 값을 통해 세션을 암호화 하여 저장
    // resave: 세션을 항상 저장할 지 여주(false를 권장)
    // saveUninitialized: 세션이 저장되기전에 uninitialize 상태로 만들어 저장
    // cookie: 쿠키 설정
  })
);

// Define Routes
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/profile', require('./routes/api/profile'));
// app.use('/api/posts', require('./routes/api/posts'));
// app.use('/api/tags', require('./routes/api/tags'));

// app.use("/api/controllers", require("./routes/controllers/media"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
