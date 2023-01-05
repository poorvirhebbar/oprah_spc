var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var exphbs = require('express-handlebars');
var fileUpload = require('express-fileupload');
var secrets = require('./secrets');
var {
  user,
  fs,
  locks
} = require('./models');

var app = express();


// view engine setup
app.engine('hbs', exphbs({
  defaultLayout: 'layout',
  partialsDir: './views/partials',
  layoutsDir: './views/layouts',
  extname: 'hbs'
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(session({
  secret: secrets.secret,
  resave: true,
  saveUninitialized: true
}));

app.use(flash());

passport.use('local', user.createStrategy());
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

app.use(passport.initialize());
app.use(passport.session());

app.use(function (req, res, next) {
  res.locals.user = req.user;
  res.locals.agent = req.get('User-Agent');
  res.locals.error = req.flash('error');
  next();
});

/* accessed only by anons: TOP */
app.get('/login', function (req, res, next) {
  if (req.user) {
    res.redirect('/');
  } else {
    res.render('login', {
      title: 'login'
    });
  }
});

app.get('/register', function (req, res, next) {
  if (req.user) {
    res.redirect('/');
  } else {
    res.render('register', {
      title: 'register'
    });
  }
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

app.post('/register', function (req, res, next) {
  if (req.user) {
    res.redirect('/');
  } else if (/^[a-zA-Z0-9!@#$%^&*]{6,16}$/.test(req.body.username)) {
    if (/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/.test(req.body.password)) {
      user.register(req.body.username, req.body.password, function (err) {
        if (err) {
          req.flash('error', err);
          res.redirect('/register');
        } else {
          passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/login'
          })(req, res, next);
        }
      });
    } else {
      let result
      req.flash('error', 'password should contain 6 to 16 valid alphanumerics, and atleast one number and one symbol.');
      res.redirect('/register');
    }
  } else {
    req.flash('error', 'username should contain 6 to 16 valid alphanumerics.');
    res.redirect('/register');
  }
});
/* accessed only by anons: END */

/* accessed by both users and anons: TOP */
app.get('/', function (req, res, next) {
  res.render('index', {
    title: 'oprah-spc'
  });
});

app.get('/download', function (req, res, next) {
  res.render('download', {
    title: 'download'
  });
});

app.get('/docs', function (req, res, next) {
  res.render('docs', {
    title: 'docs'
  });
});
/* accessed by both users and anons: END */

/* accessed only by users: TOP */
/* API process flow */
//API start
var api = express.Router();

api.get('/status', function (req, res, next) {
  res.json({
    success: req.user != null
  });
});

api.get('/lock/freeze', function (req, res, next) {
  res.json({
    lock: locks.freeze(req.user.id, req.sessionID)
  })
});

api.get('/lock/revoke', function (req, res, next) {
  res.json({
    lock: locks.revoke(req.user.id, req.sessionID)
  })
});

api.post('/login', passport.authenticate('local', {
  successRedirect: '/api/status',
  failureRedirect: '/api/status'
}));

api.use(function (req, res, next) {
  if (req.user) {
    next();
  } else {
    res.status(403);
    res.json({
      status: 403,
      error: "Forbidden"
    });
  }
});

api.get('/logout', function (req, res, next) {
  req.logout();
  res.locals.user = null;
  res.json({
    status: true
  });
});

api.get('/getSchema', function (req, res, next) {
  res.json({
    hash: req.user.schema
  })
});

api.post('/setSchema', function (req, res, next) {
  user.setSchema(req.user.id, req.body.hash);
  res.json({
    status: true
  })
});

api.post('/list', function (req, res, next) {
  if (!req.body.path) res.json({
    status: false
  });
  let data = fs.list(req.user.root, req.body.path).data;
  if (data) res.json({
    status: true,
    data: data.slice(1)
  });
  else res.json({
    status: false
  });
});

api.post('/create', function (req, res, next) {
  if (!req.body.path) res.json({
    status: false
  });
  let result = fs.mkdir(req.user.root, req.body.path);
  res.json({
    status: !!result
  });
});

api.post('/hash', function (req, res, next) {
  if (!req.body.path) res.json({
    status: false
  });
  let hash = fs.hash(req.user.root, req.body.path);
  res.json({
    hash: hash ? hash.toString('hex') : hash
  });
});

api.post('/download', function (req, res, next) {
  if (!req.body.path) res.json({
    status: false
  });
  let data = fs.read(req.user.root, req.body.path);
  if (data) {
    res.type(data.type);
    res.send(data.data);
  } else {
    res.status(404);
    res.json({
      status: 404,
      message: 'File not found'
    });
  }
});

api.post('/upload/file', function (req, res, next) {
  let data = Buffer.from(req.files.file.data);
  let status = true;
  let node = fs.list(req.user.root, req.body.path);
  if (!node) {
    status = fs.create(req.user.root, req.body.path, {
      type: req.files.file.mimetype,
      data
    });
  } else if (node.type !== 0) {
    status = fs.write(req.user.root, req.body.path, {
      type: req.files.file.mimetype,
      data
    });
  } else {
    status = false;
  }
  res.json({
    status: !!status
  });
});

api.post('/upload/folder', function (req, res, next) {
  //TODO
  res.json({
    status: false
  });
});

api.post('/remove', function (req, res, next) {
  let node = fs.list(req.user.root, req.body.path);
  if (!node) {
    res.json({
      status: false
    });
  } else if (node.type === 0) {
    fs.rmdir(req.user.root, req.body.path);
    res.json({
      status: true
    });
  } else {
    fs.delete(req.user.root, req.body.path);
    res.json({
      status: true
    });
  }
});

app.use('/api', api);
//API end

app.get('/logout', function (req, res, next) {
  if (!req.user) return next(createError(403));
  req.logout();
  res.locals.user = null;
  res.render('logout', {
    title: 'logout'
  });
});

app.get('/cloud', function (req, res, next) {
  if (!req.user) return next(createError(403));
  res.render('cloud', {
    title: 'cloud'
  });
});
/* accessed only by users: END */

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler 
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  err.status = err.status || 500;
  // render the error page
  res.status(err.status);
  res.render('error');
});

module.exports = app;
