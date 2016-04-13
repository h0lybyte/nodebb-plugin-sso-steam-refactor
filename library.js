(function(module) {
  "use strict";


  var user = module.parent.require('./user.js'),
      db = module.parent.require('../src/database.js'),
      meta = module.parent.require('./meta'),
      passport = module.parent.require('passport'),
      passportSteam = require('passport-steam').Strategy,
      http = module.parent.require('http'),
      winston = module.parent.require('winston');
      fs = module.parent.require('fs'),
	  	path = module.parent.require('path'),
	  	async = module.parent.require('async');

      var constants = Object.freeze({
        'name': 'Steam',
        'admin': {
         'route': '/plugins/sso-steam',
    			'icon': 'fa-steam'
        }
      });
  
  	var authenticationController = module.parent.require('./controllers/authentication');
  
   var Steam = {};
   
    Steam.init = function(data, callback) {
      			function render(req, res, next) {
  			res.render('admin/plugins/sso-steam', {});
  		}
  		data.router.get('/admin/plugins/sso-steam', data.middleware.admin.buildHeader, render);
  		data.router.get('/api/admin/plugins/sso-steam', render);
  		callback();
	  };
	
  
    Steam.getStrategy = function(strategies, callback) {
    		meta.settings.get('sso-steam', function(err, settings) {
    			if (!err && settings['key']) {
    				passport.use(new passportSteam({
    				  returnURL: module.parent.require('nconf').get('url') + '/auth/steam/callback',
              realm: module.parent.require('nconf').get('url'),
              apiKey: settings['key']
    				}, function(identifier, profile, done) {
        process.nextTick(function () {
          // As Steam Passport does't not provide the username, steamid and avatar information, we have to get from Steam API using http get request.
          var clientApiKey = Steam.apiKey,
              Steam64Id = identifier.replace('http://steamcommunity.com/openid/id/', ''),
              apiUrl = 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + clientApiKey + '&steamids=' + Steam64Id,
              player = {};
          http.get(apiUrl, function(res) {
            res.on('data', function(chunck){
              var responseObj = JSON.parse(chunck.toString());
              player.id = responseObj.response.players[0].steamid;
              player.username = responseObj.response.players[0].personaname;
              player.avatar = responseObj.response.players[0].avatarfull;
              player.profileurl = responseObj.response.players[0].profileurl;

              Steam.login(player.id, player.username, player.avatar, player.profileurl, function(err, user) {
                if (err) {
                  return done(err);
                }
                done(null, user);
              });

            });
          }).on('error', function(e) {
            console.log('problem with request: ' + e.message);
          });
        });
      }));

      strategies.push({
        name: 'steam',
        url: '/auth/steam',
        callbackURL: '/auth/steam/callback',
        icon: constants.admin.icon,
        scope: 'user:username'
      });
      
      
    }

      callback(null, strategies);
    });
  };
  
  
  
	

  module.exports = Steam;
}(module));