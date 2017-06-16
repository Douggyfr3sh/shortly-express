var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  //tablename
  tableName: 'users',
  initialize: function() {
    this.on('creating', this.hashPassword);
  },

  comparePassword: function(attempt, cb) {
    bcrypt.compare(attemptedPassword, this.get('password'), (err, isMatch) => {
      cb(isMatch);
    });
  },

  hashPassword: function() {
    var hasher = Promise.promisify(bcrypt.hash);

    return hasher(this.get('password'), null, null).bind(this)
      .then( (hash) => {
        this.set('password', hash);
      });
  }

});

module.exports = User;