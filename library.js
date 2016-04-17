(function(module) {
  "use strict";

  var user = module.parent.require('./user.js'),
      db = module.parent.require('../src/database.js'),
      meta = module.parent.require('./meta'),
      passport = module.parent.require('passport'),
      passportSteam = require('passport-steam').Strategy,
      http = module.parent.require('http'),
      winston = module.parent.require('winston');

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
                                                apiKey: settings['key'],
                                                passReqToCallback: true
                                      				},function(req, identifier, profile, done) {
                                      				    if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
                                                      	user.setUserField(req.user.uid, 'steamid', profile.id);
                                                      	db.setObjectField('steamid:uid', profile.id, req.user.uid);
                                                        return done(null, req.user);
                                                       	}
                                                  Steam.login(profile.id, profile.displayName, profile._json.profileurl, profile._json.avatarfull, function(err, user) {
                                                     if (err) {
                                                       return done(err);
                                                      	}
                                                                  
                                                        authenticationController.onSuccessfulLogin(req, user.uid);
                                                        done(null, user);
                                                       	});
                                    					
                                      				})
                                      				
                                				);

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
  
  
  
  
  
  
  
  
  
  
  
  
  
  
      Steam.getAssociation = function(data, callback) {
        		user.getUserField(data.uid, 'steamid', function(err, steamID) {
        			if (err) {
        				return callback(err, data);
        			}
        
        			if (steamID) {
        				data.associations.push({
        					associated: true,
        					url: 'http://steamcommunity.com/profiles/' + steamID,
        					name: constants.name,
        					icon: constants.admin.icon
        				});
        			} else {
        				data.associations.push({
        					associated: false,
        					url: module.parent.require('nconf').get('url') + '/auth/steam',
        					name: constants.name,
        					icon: constants.admin.icon
        				});
        			}
        
        			callback(null, data);
        		})
        	};
  
  

      Steam.login = function(steamID, username, profileUrl, avatar, callback) {
          
      
          Steam.getUidBySteamID(steamID, function(err, uid) {
            if(err) {
              return callback(err);
            }
      
            if (uid !== null) {
              callback(null, {
                uid: uid
              });
            } else {
              user.create({username: username}, function(err, uid) {
                if (err !== null) {
                  callback(err);
                } else {
                  user.setUserField(uid, 'steamid', steamID);
                  user.setUserField(uid, 'profileurl', profileUrl);
                  db.setObjectField('steamid:uid', steamID, uid);
      
                  // Save their avatar
                  user.setUserField(uid, 'uploadedpicture', avatar);
                  user.setUserField(uid, 'picture', avatar);
      
                  callback(null, {
                    uid: uid
                  });
                }
              });
            }
          });
        };
      
      Steam.getUidBySteamID = function(steamID, callback) {
        db.getObjectField('steamid:uid', steamID, function(err, uid) {
          if (err !== null) {
            return callback(err);
          }
          callback(null, uid);
        });
      };
    
      
      Steam.addMenuItem = function(custom_header, callback) {
    		custom_header.authentication.push({
    			"route": constants.admin.route,
    			"icon": constants.admin.icon,
    			"name": constants.name
    		});

		callback(null, custom_header);
	};

  
  
	

  module.exports = Steam;
}(module));