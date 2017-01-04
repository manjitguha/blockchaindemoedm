/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var fs = require('fs');

var app = express();

var db;

var cloudant;

var fileToUpload;

var dbCredentials = {
	dbName : 'my_sample_db',
	patientDbName : 'patientdb'
};

var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var multipart = require('connect-multiparty')
var multipartMiddleware = multipart();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
	extended : true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/css')));

// development only
if ('development' == app.get('env')) {
	app.use(errorHandler());
}

function initDBConnection() {
	// When running on Bluemix, this variable will be set to a json object
	// containing all the service credentials of all the bound services
	if (process.env.VCAP_SERVICES) {
		var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
		// Pattern match to find the first instance of a Cloudant service in
		// VCAP_SERVICES. If you know your service key, you can access the
		// service credentials directly by using the vcapServices object.
		for ( var vcapService in vcapServices) {
			if (vcapService.match(/cloudant/i)) {
				dbCredentials.url = vcapServices[vcapService][0].credentials.url;
			}
		}
	} else { // When running locally, the VCAP_SERVICES will not be set

		// When running this app locally you can get your Cloudant credentials
		// from Bluemix (VCAP_SERVICES in "cf env" output or the Environment
		// Variables section for an app in the Bluemix console dashboard).
		// Alternately you could point to a local database here instead of a
		// Bluemix service.
		// url will be in this format:
		// https://username:password@xxxxxxxxx-bluemix.cloudant.com
		dbCredentials.url = "REPLACE ME";
	}

	cloudant = require('cloudant')(dbCredentials.url);

	// check if DB exists if not create
	cloudant.db.create(dbCredentials.dbName, function(err, res) {
		if (err) {
			console.log('Could not create new db: ' + dbCredentials.dbName
					+ ', it might already exist.');
		}
	});

	// check if patientDbName exists if not create
	cloudant.db.create(dbCredentials.patientDbName, function(err, res) {
		if (err) {
			console
					.log('Could not create new db: '
							+ dbCredentials.patientDbName
							+ ', it might already exist.');
		}
	});

	db = cloudant.use(dbCredentials.dbName);
}

initDBConnection();

app.get('/', routes.index);

app.get('/api/users', function(request, response) {
	console.log("/api/users method invoked.. ");

	db = cloudant.use(dbCredentials.dbName);
	var userList = [];
	var i = 0;
	db.list(function(err, body) {
		if (!err) {
			var len = body.rows.length;
			console.log('total # of users -> ' + len);
			body.rows.forEach(function(document) {
				db.get(document.id, {
					revs_info : true
				}, function(err, user) {
					if (!err) {
						userList.push(user);
						i++;
						console.log('User is ->' + user);

						if (i >= len) {
							response.write(JSON.stringify({
								status : 200,
								body : userList
							}));

							response.end();
							console.log('ending response...');
						}
					} else {
						response.write(JSON.stringify({
							status : 200
						}));
						response.end();
					}
				});
				console.log('Adding User');
			});
		} else {
			console.log(err);
			response.write(JSON.stringify({
				status : 200
			}));
			response.end();
		}
	});
});

app
		.post(
				'/api/authenticate',
				function(request, response) {
					console.log("/api/authenticate method invoked.. ");

					var username = request.param('username');
					var password = request.param('password');
					console.log('username -->' + username);
					console.log('password -->' + password);

					if (!username && !password) {
						username = request.body.username;
						password = request.body.password;
					}
					console.log('username -->' + username);
					console.log('password -->' + password);

					if (username && password) {
						db = cloudant.use(dbCredentials.dbName);
						var userList = [];
						var i = 0;
						db.find({
							"selector" : {
								"username" : {
									"$eq" : username
								},
								"password" : {
									"$eq" : password
								}
							},
							"fields" : []
						}, function(err, doc) {
							if (!err) {
								console.log('User --> ' + doc);
								console.log('User Docs--> ' + doc.docs);
								console.log('No of Users --> '
										+ doc.docs.length);
								if (doc.docs.length > 0) {
									response.write(JSON.stringify({
										status : 200,
										body : {
											token : 'fake-jwt-token',
											loggedIdUser : doc.docs[0]
										}
									}));
									response.end();
								} else {
									response.write(JSON.stringify({
										status : 200
									}));
									response.end();
								}
							} else {
								response.write(JSON.stringify({
									status : 200
								}));
								response.end();
							}
						});
					} else {
						console
								.log("/api/authenticate method invocation failed.. username or password is blank");
						response.write(JSON.stringify({
							status : 200
						}));
						response.end();
					}
				});

app
		.post(
				'/api/patient',
				function(request, response) {
					console.log("/api/patient method invoked.. ");

					var firstname = request.param('firstname');
					var middlename = request.param('middlename');
					var lastname = request.param('lastname');
					var address = request.param('address');
					var city = request.param('city');
					var state = request.param('state');
					var zip = request.param('zip');
					var gender = request.param('gender');
					var dateofbirth = request.param('dateofbirth');

					console.log('firstname -->' + firstname);
					console.log('middlename -->' + middlename);
					console.log('lastname -->' + lastname);
					console.log('address -->' + address);
					console.log('city -->' + city);
					console.log('state -->' + state);
					console.log('zip -->' + zip);
					console.log('gender -->' + gender);
					console.log('dateofbirth -->' + dateofbirth);

					if (!firstname && !middlename && !lastname && !address
							&& !city && !state && !zip && !gender
							&& !dateofbirth) {
						firstname = request.body.firstname;
						middlename = request.body.middlename;
						lastname = request.body.lastname;
						address = request.body.address;
						city = request.body.city;
						state = request.body.state;
						zip = request.body.zip;
						gender = request.body.gender;
						dateofbirth = request.body.dateofbirth;
					}
					console.log('firstname -->' + firstname);
					console.log('middlename -->' + middlename);
					console.log('lastname -->' + lastname);
					console.log('address -->' + address);
					console.log('city -->' + city);
					console.log('state -->' + state);
					console.log('zip -->' + zip);
					console.log('gender -->' + gender);
					console.log('dateofbirth -->' + dateofbirth);

					if (firstname && middlename && lastname && address && city
							&& state && zip && gender && dateofbirth) {
						db = cloudant.use(dbCredentials.patientDbName);

						db.insert({
							firstname : firstname,
							middlename : middlename,
							lastname : lastname,
							address : address,
							city : city,
							state : state,
							zip : zip,
							gender : gender,
							dateofbirth : dateofbirth
						}, '', function(err, doc) {
							if (err) {
								console.log(err);
								response.sendStatus(500);
							} else {
								response.write(JSON.stringify({
									status : 200,
									patient : JSON.stringify(doc)
								}));
								response.end();
							}
						});

					} else {
						console
								.log("/api/patient method invocation failed.. username or password is blank");
						response.write(JSON.stringify({
							status : 200
						}));
						response.end();
					}
				});



app
		.get(
				'/api/patient',
				function(request, response) {
					console.log("/api/patient get method invoked.. ");

					var firstname = request.param('firstname');
					var middlename = request.param('middlename');
					var lastname = request.param('lastname');
				
					console.log('firstname -->' + firstname);
					console.log('middlename -->' + middlename);
					console.log('lastname -->' + lastname);
					
					if (!firstname && !middlename && !lastname) {
						firstname = request.body.firstname;
						middlename = request.body.middlename;
						lastname = request.body.lastname;
					}
					console.log('firstname -->' + firstname);
					console.log('middlename -->' + middlename);
					console.log('lastname -->' + lastname);
					
					if (firstname || middlename || lastname) {
						db = cloudant.use(dbCredentials.patientDbName);
						
						var searchstring='[';
						var hasPreviousElem = false;
						if(firstname){
							searchstring+='{"firstname":"'+firstname+'"}';
							hasPreviousElem = true;
						}
						if(middlename){
							if(hasPreviousElem == true){
								searchstring+=',';
							}
							searchstring+='{"middlename":"'+middlename+'"}';
							hasPreviousElem = true;
						}
						if(lastname){
							if(hasPreviousElem == true){
								searchstring+=',';
							}
							searchstring+='{"lastname":"'+lastname+'"}';
						}
						searchstring+=']';
						console.log('searchstring -->' + searchstring);
							 
						
						db.find({
							"selector" : {
								"$or":searchstring
							},
							"fields" : []
						}, function(err, doc) {
							if (!err) {
								var userList = [];
								
								console.log('User --> ' + doc);
								console.log('User Docs--> ' + doc.docs);
								console.log('No of Patients --> '
										+ doc.docs.length);
								if (doc.docs.length > 0) {
									for(var i=0;i<doc.docs.length;i++){
										userList.push(doc.docs[i]);
									}
									
									response.write(JSON.stringify({
										status : 200,
										body : userList
									}));
									response.end();
								} else {
									response.write(JSON.stringify({
										status : 200
									}));
									response.end();
								}
							} else {
								response.write(JSON.stringify({
									status : 200
								}));
								response.end();
							}
						});
						
						
						db.find({
							firstname : firstname,
							middlename : middlename,
							lastname : lastname,
						}, '', function(err, doc) {
							if (err) {
								console.log(err);
								response.sendStatus(500);
							} else {
								response.write(JSON.stringify({
									status : 200,
									patient : JSON.stringify(doc)
								}));
								response.end();
							}
						});

					} else {
						console
								.log("/api/patient method invocation failed.. username or password is blank");
						response.write(JSON.stringify({
							status : 200
						}));
						response.end();
					}
				});




http.createServer(app).listen(app.get('port'), '0.0.0.0', function() {
	console.log('Express server listening on port ' + app.get('port'));
});
