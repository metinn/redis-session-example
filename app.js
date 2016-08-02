var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var auth = require('basic-auth');
var RedisSessions = require("redis-sessions");
var rs = new RedisSessions();
var rsapp = "redissessionexample";

var app = express();

app.locals.secretKey = 'Philip J. Fry';
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// index kullanici kontrolsuz deneme sayfasi
app.get('/', function (req, res) {
  res.send('cevap')
})

// HTTP basic auth ile kullanici girisi yapmak icin olusturulan sayfa. Gonderilen kullanici test ve sifre 123 ise giris yapilir ve cookie ayarlanir.
app.get('/login', function (req, res) {
  var user = auth(req)
  console.log('user ', user)
  if (user && user.name == 'test' && user.pass == '123') {
    // session olustur.
    rs.create({
        app: rsapp,
        id: 'test1',
        ip: req.ip,
        ttl: 3600,
        d: { // istege bagli genisletilebilir bilgiler
          kullanici: 'Test kullanicisi'
        }
      },
      function(err, token) {
        if (err) {
          console.log(err)
          res.status(500).send('hata')
        } else {
          console.log('token-> ', token);
          // cookie gonder. httpOnly= browsera bunu kullan ama javascript tarafindan ulasilmasini engelle soyler
          res.cookie('redis.token', token, {httpOnly: true})
          res.send('session olusturuldu.')
        }
      });

  } else {
    res.status(401).send('yetkisizin')
  }
})

// kullanici kontrolunun yapildigi ara fonksiyon.
app.use(function (req, res, next) {
  // cookie yi al
  var cookie = req.cookies['redis.token'];
  // rediste var mi kontrol et
  if (cookie) {
    // redis tepki suresi hesabi
    var baslangic = Date.now()
    rs.get({
      app: rsapp,
      token: cookie.token},
      function(err, resp) {
        if (err) {
          res.send('session yok.geri don')
        } else {
          console.log('redis tepki suresi '+ (Date.now() - baslangic)+'ms')
          req.kullanici = resp
          next()
        }
      });

  } else {
    // cookie yok, giris yapilmamis
    res.status(401).send('izinsiz')
  }
})

app.get('/bilgi', function (req, res) {
  res.send('bilgi, id='+ req.kullanici.d.kullanici)
})






// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
