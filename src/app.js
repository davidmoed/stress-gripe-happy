/**
   @file Set up all the dependencies and set paths to each page
   @author David Moed
   @version 1.0.0
*/


/**
   @module dependencies
   @description Add dependencies, set static paths, and require mongoose models to make the app work
*/
const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

require('./db');

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const User = mongoose.model('User');
const Stress = mongoose.model('Stress');
const Gripe = mongoose.model('Gripe');


const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt   = require('bcrypt-nodejs');

app.use(cookieParser());
app.use(session({
   secret: 'shhh it\'s a cookie',
   resave: true,
   saveUninitialized: true
})); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

require('./config/passport')(passport);


const path = require("path");
const publicPath = path.resolve(__dirname, "public");
const jsdocPath = path.resolve(__dirname, "public/documentation");
app.use(express.static(publicPath));
app.set('views', path.join(__dirname,'/views'));
app.set('docs', path.join(__dirname,'/documentation'));


app.set('view engine', 'hbs');
app.set('docs engine', 'hbs');


app.set( 'port', ( process.env.PORT || 5000 ));

// https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif
const GphApiClient = require('giphy-js-sdk-core');
const client = GphApiClient(process.env.giphy_api_key);


//end dependencies/modules

/**
@module expressApps
@description All gets and posts for the web app
*/

/**
   Create a route handler to the signup page
   @name Signup
   @route {GET} /signup
*/
app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup', { message: req.flash('signupMessage') });
    });

/**
    Check for proper authentication and redirect to add and back to signup accordingly
    @name Signup Authentication
    @route {POST} /signup
    @authentication This post uses passport authentication to ensure the user entered a proper username and password
 */
app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/add', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages

    }));

/**
   Create a route handler to the login page
   @name Login
   @route {GET} /login
*/
app.get('/login', function(req, res) {

   // render the page and pass in any flash data if it exists
   res.render('login', { message: req.flash('loginMessage') });
});



/**
    Check for proper authentication and redirect to add and back to signup accordingly
    @name Login Authentication
    @route {POST} /login
    @authentication This post uses passport authentication to ensure the user entered a proper username and password
 */
app.post('/login', passport.authenticate('local-login', {
   successRedirect : '/', // redirect to the secure profile section
   failureRedirect : '/signup', // redirect back to the signup page if there is an error
   failureFlash : true // allow flash messages
}));


/**
   Logout the current user using passport and redirect to the login page
   @name Logout
   @route {GET} logout
   @authentication This calls a passport function that logs out the current user
*/
app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });


/**
   Check if the user is properly logged in, if not redirect to the login page
   @function isLoggedIn
   @param req the http request
   @param res the http response
   @param next the next page due to be called in a redirect
*/
function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
      return next();

  // if they aren't redirect them to the home page
  res.redirect('/login');
}


/**
   Create a route handler to the main page
   @name Homepage
   @route {GET} /
   @bodyparam {string} req.user The id of the current user
   @param {array} stresses Load all the stresses to render them on the main dropdown
   @param {string} firstGripe Check if the first stress has gripes, if it does load the first one on page load
   @authentication The route requires that the user be logged in using the isLoggedIn function
*/
app.get('/', isLoggedIn, function(req, res) {

   const stresses = [];
   let firstGripe = '';

   Stress.find({_users: req.user}, (err, stress) => {

      for (let i = 0; i < stress.length; i++) {
         stresses.push(stress[i]);
      }

      const firstStress = stresses[0];
      if (firstStress !== undefined) {
         const firstGripeObj = firstStress.gripes;

         if (firstGripeObj !== undefined) {
            firstGripe = firstGripeObj[0];
            console.log("DEV - Main page loaded with existing stresses and a gripe");
            res.render('main', {stressObj: stresses, gripeArr: firstGripe, user : req.user});
         }
      } else {
         const message = "You don't have any stresses and gripes yet, try typing in a stress to the left window and afterwards adding a gripe to it in the right window."
         res.render('add', {message: message, user : req.user});
      }

   });

});

/**
   Create a route handler to the main page that gets the current stress and the gripes associated with it
   @name Get Gripe for Homepage
   @route {GET} /getGripe
   @bodyparam {string} req.user The id of the current user
   @queryparam {string} theStress The currently selected stress in the homepage dropdown
   @param {array} stresses Loads all the stresses to render them on the main dropdown
   @param {Stress} topStress Once the user picks a stress, keep it on top of the dropdown menu so they can continue griping about that stress
   @param {array} gripeArr Loads all the gripes for the currently selected stress in main dropdown
   @param {Gripe} randomGripe Pick a random gripe from the currently selected stress to be displayed on the page
   @authentication The route requires that the user be logged in using the isLoggedIn function
*/
app.get('/getGripe', isLoggedIn, function(req, res) {

   const stresses = [];
   Stress.find({_users: req.user}, function (err, stress) {
      for (let i = 0; i < stress.length; i++) {
         stresses.push(stress[i]);
      }

      for (let i = 0; i < stresses.length; i++) {
         if (stresses[i].stressName === req.query.theStress) {
            const temp = stresses[0];
            stresses[0] = stresses[i];
            stresses[i] = temp;
            break;
         }
      }
      console.log("DEV - Stress order reshuffled, " + req.query.theStress + " now on top of dropdown");
   });

   let gripeArr = [];
   Stress.findOne({stressName : req.query.theStress}, function(err, stress, count) {

      console.log('stress: ', stress);
      console.log('num gripes: ' + stress.totalGripes);
      //get all of the gripes
      gripeArr = stress.gripes;

      if (gripeArr.length > 0) {
         const randomGripeNum = Math.floor(Math.random() * gripeArr.length) - 1;

         console.log("DEV - Random gripe #" + randomGripeNum + " loaded: " + gripeArr[randomGripeNum].gripeStr);

         res.render('main', {stressObj: stresses, gripeArr: gripeArr[randomGripeNum]});
      } else {
         console.log('error', err)
      }


   });


});


/**
   Create a route handler to set the page up that has the forms to add stresses and gripes
   @name Add Page
   @route {GET} /add
   @param {array} stresses loads all the stresses to render them on the main dropdown
   @authentication The route requires that the user be logged in using the isLoggedIn function
*/
app.get('/add', isLoggedIn, function(req, res) {

   const stresses = [];

   /** @inner get all the stresses that the user has already created to display them on the page */
   Stress.find({_users: req.user}, (err, stress) => {

      for (let i = 0; i < stress.length; i++) {
         stresses.push(stress[i]);
      }
      console.log("DEV - Add page loaded with existing stresses");
   });

   res.render('add', {stressObj: stresses, user : req.user});
});


/**
   Add new stresses to the user's db
   @name Add Stresses
   @route {POST} addStressForm
   @bodyparam {string} req.body.newStress check the input box for new stresses
   @bodyparam {string} req.user The id of the current user
   @param {Boolean} addStress ensure the stress that user wants to add does not already exist by changing the value of this boolean
   @param {Stress} aStress a new stress schema created and added if the stress entered by the user does not already exist
*/
app.post("/addStressForm", function(req, res) {

   //if there's a new stress
   if (req.body.newStress !== '') {

      Stress.find({_users: req.user}, function (err, stress) {

         let addStress = true;
         for (let i = 0; i < stress.length; i++) {
            if (stress[i].stressName === req.body.newStress) {
               console.log("DEV - Stress not added: " + req.body.newStress + " already exists");
               addStress = false;
               break;
            }
         }

         if (addStress) {
            //create a new stress
            const aStress = new Stress({
               stressName: req.body.newStress,
               totalGripes: 0,
               gripes: [],
            });
            //add the user id
            aStress["_users"] = req.user._id;

            //save the stress to the db
            aStress.save(function(err, stress, count) {
               console.log("DEV - Stress added: " + req.body.newStress);
               //save the stress to the db
            });
         }
         res.redirect('/add');
      });
   } //end if
}); //end push /addStressForm


/**
   Post new gripes to a specified stress
   @name Add Gripes
   @route {POST} /addGripeForm
   @bodyparam {string} req.body.newGripe check the input box for new gripes
   @bodyparam {string} req.body.curStress The currently selected stress in the dropdown menu on the Add page
   @bodyparam {string} req.user The id of the current user
   @param {Boolean} addGripe ensure the gripe that user wants to add does not already exist by changing the value of this boolean
   @param {Gripe} aGripe a new gripe schema created and added if the gripe entered by the user does not already exist
*/
app.post("/addGripeForm", function(req, res) {
   //if there's a new gripe
   if (req.body.newGripe !== '') {

      //check the db to see if the new stress is already there
      Stress.findOne({stressName: req.body.curStress, _users: req.user}, function (err, stress) {

         //check to see if the gripe already exists
         let addGripe = true;
         for (let j = 0; j < stress.gripes.length; j++) {
            if (stress.gripes[j].gripeStr === req.body.newGripe) {
               console.log("DEV - Gripe not added: " + req.body.newGripe + " already exists");
               addGripe = false;
               break;
            }
         }

         //if the gripe does not exist, add it to the stress
         if (addGripe) {
            //increment the total number of gripes
            stress.totalGripes += 1;

            //create a new gripe object
            const aGripe = new Gripe({
               gripeNum: stress.totalGripes,
               gripeStr: req.body.newGripe
            });

            //add the gripe to the stress object
            stress.gripes.push(aGripe);

            //update the stress in the db
            stress.save(function(saveErr, saveStress, saveCount) {
               console.log("DEV - Gripe added: " + req.body.newGripe);
            });
         }
         res.redirect('/');
      });
   }

}); //end push /addGripeForm


/**
   Create a route handler to set the page up with the happy gifs
   @name Happy Page
   @route {GET} /happy
   @bodyparam {string} req.user The id of the current user
   @param {array} stresses loads all the stresses to render them on the main dropdown
   @param {array} theGif an array that holds the image url of a gif randomly populated within the first 75 gifs tagged "happy" in the Giphy API
   @authentication The route requires that the user be logged in using the isLoggedIn function
*/
app.get('/happy', isLoggedIn, function(req, res) {

   const stresses = [];
   let gripeArr = [];

   Stress.find({_users: req.user}, (err, stress) => {

      for (let i = 0; i < stress.length; i++) {
         stresses.push(stress[i]);
      }
      console.log("DEV - Happy page loaded with existing stresses and gripes");

      //read in the giphy api key
      const theGif = [];

      let apiKey = process.env.giphy_api_key;

      //get a random gif to display to the user, pulling from the first 75 gifs with the tag "happy"
      const randomizeGif = Math.floor(Math.random() * 75);

      //TODO make api call async
      client.search('gifs', {"api_key": apiKey, "q": "happy", "limit": "1", "offset" : randomizeGif})
     .then((response) => {
       response.data.forEach((gifObject) => {
         theGif.push(gifObject.images.original);
         console.log("DEV - Loaded a gif to make you happy: " + gifObject.images.original.gif_url);

         res.render('happy', {stressObj: stresses, user : req.user, gripeArr: gripeArr, gifObject: theGif[0]});
       })
     })
     .catch((err) => {
        console.log("DEV - Poop! Gif not loaded.");
        console.log(err);
     })
   });

});

/**
   delete stresses from the user's db
   @name Delete Stress
   @route {POST} /deleteStress
   @bodyparam {string} req.user The id of the current user
   @bodyparam {string} req.body.curStress The currently selected stress in the dropdown menu on the Happy page
*/
app.post("/deleteStress", function(req, res) {

   Stress.findOneAndRemove({stressName: req.body.curStress, _users: req.user}, function (err, stress) {

      console.log("DEV - Removing stress: " + stress.stressName);
      //update the stress in the db
      res.redirect('/happy');
   });

});

/**
   Go to the site docs generated with jsdoc
   @name Docs
   @route {GET} /appDocs
*/
app.get('/appDocs', function(req, res) {
   res.redirect('documentation/index.html');
});

/**
   Set the 404 Route (ALWAYS Keep this as the last route)
   @name 404
   @route {GET} *
   @authentication The route requires that the user be logged in using the isLoggedIn function
*/
app.get('*', isLoggedIn, function(req, res){
  res.render('lost');
});

// const port = process.env.PORT || 8000;
// app.listen(port, function() {
//     console.log("App is running on port " + port);
// });
app.listen( app.get( 'port' ), function() {
  console.log( 'Node server is running on port ' + app.get( 'port' ));
  });
