

/**
* @file Set up each Mongoose schema that we will use in app.js and in our database
* @requires mongoose
* @author David Moed
* @version 1.0.0
*/

/**
* @module dbDependencies
   @description Set up mongoose and bcrypt for database management
*/
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt   = require('bcrypt-nodejs');


/**
 @module schemaSetup
 @description Set up each schema to be used by the db along with passwork hashing and validation*/
/**
   @name User
 * @type {Schema}
 * @description Sets user Schema
 * @param {string} username - username
 * @param {string} password - password
 */
const User = new Schema({

   local            : {
        email        : {
          type: String,
          unique: true,
          required: true,
          trim: true
        },
        password     : {
          type: String,
          required: true
       },
       stresses : [{ type: Schema.Types.ObjectId, ref: 'Stress' }]
   }
});


User.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
User.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

/**
   @name Gripe
 * @type {Schema}
 * @description Schema for gripes
 * @param {number} gripeNum - current gripe # for naming purposes (gotten from stress counter)
 * @param {string} gripeStr - a gripe sentence generated by the user
 */
const Gripe = new Schema({
	gripeNum: Number,
	gripeStr: {
		type: String
	}
});

/**
   @name Stress
 * @type {Schema}
 * @description Schema for stresses
 * @param {string} stressName - a stress name generated by the user
 * @param {number} totalGripes - counter of number of gripes for each stress (increments for current gripe)
 * @param {object} gripes - an object of all gripes for a given stress
 */
const Stress = new Schema({
	stressName: {
		type: String,
	   required: true,
	   trim: true
	},
   totalGripes: Number,
   gripes: [ Gripe ],
   _users: [{type: Schema.Types.ObjectId, ref: 'User' }]
});


//set each schema as a model
mongoose.model('User', User);
mongoose.model('Stress', Stress);
mongoose.model('Gripe', Gripe);

module.exports = mongoose.model('User', User);


/**
   Check if the environment variable, NODE_ENV is set to PRODUCTION
   @name checkProduction
   @param {string} dbconf secret data with the login credentials pulled in order to connect to the proper location with mongodb
*/
if (process.env.NODE_ENV === 'PRODUCTION') {
   // if we're in PRODUCTION mode, then read the configration from a file
   // use blocking file io to do this...
   const fs = require('fs');
   const path = require('path');
   const fn = path.join(__dirname, 'config.json');
   const data = fs.readFileSync(fn);

   // our configuration file will be in json, so parse it and set the
   // conenction string appropriately!
   const conf = JSON.parse(data);
   let dbconf = conf.dbconf;
   mongoose.connect(dbconf, {useMongoClient: true});
} else {
    // if we're not in PRODUCTION mode, then use
    let dbconf = 'mongodb://localhost/djm552-final-project';
    mongoose.connect(dbconf, {useMongoClient: true});
}
