var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  //tablename
  tableName: 'users',
  //hasTimestamps: true
});

console.log(User);

module.exports = User;