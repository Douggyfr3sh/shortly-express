var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
//external verifiers.

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var session = require('express-session');


var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'shhh, it\'s a secret',
  resave: false,
  saveUninitialized: true
}));






// var authenticated = function (req,res, next) {
//   var hardcode = true;//hardcoded to true for now waiting on auth.
//   if (hardcode) {//check if req is not authenticated...
//     res.redirect('/login');
//   } else {
//     next();
//   }
// };



app.get('/', util.checkUser,
function(req, res) {
  console.log('in get root, req.session= ', req.session);
  res.render('index');
});

app.get('/create', util.checkUser,
function(req, res) {
  res.render('index');
});

app.get('/links', util.checkUser,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

//render login page
app.get('/login',
function(req, res) {
  res.render('login');
});


app.post('/login', (req, res) => {
  var username = req.body.username;
  var password = req.body.password;

  //check if username exists
  new User({username: username}).fetch().then( (user) => {
    //Check for empty input
    if (!user) {
      return res.redirect('/login');
    }
    //if user exists, compare password
    console.log('in login post: password =', password, 'user.getpassword: ', user.get('password'));

    // if (password === user.get('password')) {
    //   util.createSession(req, res, username);
    // } else {
    //   console.log('error checking password');
    //   res.redirect('/login');
    // }


    bcrypt.compare(password, user.get('password'), (err, match) => {

      if (match) {
        util.createSession(req, res, user);

      } else {
        console.log('error checking password');
        res.redirect('/login');
      }
    });

   // res.redirect('/');

  });
});

app.get('/logout', (req, res) => {
  console.log('got to logout endpoint.');
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/signup', (req,res) => {
  res.render('signup');
});

//handle new user signup
app.post('/signup', (req, res) => {
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username})
    .fetch()
    .then((user) => {
      if (!user) {
        bcrypt.hash(password, null, null, (err, hash) => {
          Users.create({
            username: username,
            password: hash
          }).then((user) => {
            util.createSession(req, res, user);
          });
        });
      } else {
        console.log('Account exists!');
        res.redirect('/signup');
      }
    });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
