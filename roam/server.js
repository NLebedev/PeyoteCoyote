var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var apoc = require('apoc');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var yelp = require('./App/Utils/api');
var nodemailer = require('nodemailer');
var gmailKeys = require('./App/Utils/apiKeys').gmailKeys;
var gPass = require('./App/Utils/apiKeys').password;
var formattedDateHtml = require('./App/Utils/dateFormatter');
var generateEmail = require('./App/Utils/emailGenerator');
var boundingBoxGenerator = require('./App/Utils/boundingBoxGenerator');
var roamOffGenerator = require('./App/Utils/roamOffGenerator');
var saltRounds = 10;


//config for email SMTP for gmail. We are send email notifications to users
var smtpConfig = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: 'typosroam@gmail.com',
    pass: gPass
  }
};

//transport vehicle for nodemailer to send out email
var transporter = nodemailer.createTransport(smtpConfig);

app.use(bodyParser.json());

//Checks to make sure server is working
app.get('/', function(req, res){
  res.send('Hello World!');
});

//Post to server on signup page
app.post('/signup', function(req, res){
  var data = req.body;

  //Check database to see if incoming email on signup already exists
  apoc.query('MATCH (n:User {email: "%email%"}) RETURN n', { email: data.email }).exec().then(function(queryRes) {
    //If there is no matching email in the database
    if (queryRes[0].data.length === 0) {
      //Hash password upon creation of account
      bcrypt.genSalt(saltRounds, function(err, salt) {
        if (err) {
          console.log('Error generating salt', err);
        }
        bcrypt.hash(req.body.password, salt, function(err, hash) {
          if (err) {
            console.log('Error hashing password', err);
          }
          data.password = hash;
          //Creates new user in database
          apoc.query('CREATE \
            (newUser:User {\
              firstName: "%firstName%", \
              lastName: "%lastName%", \
              password: "%password%", \
              email: "%email%" \
            });',
            data
          ).exec().then(
            function(dbRes){
              console.log('saved to database:', dbRes);
              res.send(JSON.stringify({message: 'User created'}));
            },
            function(fail){
              console.log('issues saving to database:', fail);
            }
          );
        });
      }); //close genssalt
    } else {
      res.send(JSON.stringify({message: 'Email already exists!'}));
    }
  }); //closing 'then'
}); //close post request

//Validation for sign in page
app.post('/signin', function(req, res) {
  var data = req.body;
  apoc.query('MATCH \
    (n:User {email: "%email%"}) \
      RETURN n.password',
    {email: data.email}
  )
  .exec().then(function(queryRes){
    if(queryRes[0].data.length === 0) {
      res.send(JSON.stringify({message: 'Incorrect email/password combination!'}));
    } else {
      console.log(queryRes[0].data[0].row[0]);
      bcrypt.compare(data.password, queryRes[0].data[0].row[0], function(err, bcryptRes){
       if(err){
        console.log('error in comparing password:', err);
       }
        if(bcryptRes){
          res.send(JSON.stringify({message: 'Password Match'}));
        } else {
          res.send(JSON.stringify({message: 'Incorrect email/password combination!'}));
        }
      });
    }
  });
});

//Page to set up event between users, making API calls to YELP
app.post('/roam', function(req, res) {

	var dateMS = Date.now();
  var userEmail = req.body.userEmail;
  var type = req.body.type;
  var coords = boundingBoxGenerator(req); //bounding box coordinates
  var times = roamOffGenerator(req); //time until roam ends

  //Checks to make sure if there is an existing pending roam within similar location by a different user
	apoc.query('MATCH \
    (n:Roam) \
      WHERE n.creatorRoamEnd > %currentDate% \
        AND n.status = "Pending" \
        AND n.creatorLatitude < %maxLat% \
        AND n.creatorLatitude > %minLat% \
        AND n.creatorLongitude < %maxLong% \
        AND n.creatorLongitude > %minLong% \
        AND n.creatorEmail <> "%userEmail%" \
        AND n.type = "%type%" RETURN n',
      {
        currentDate:dateMS,
        maxLat: coords.maxLat,
        minLat: coords.minLat,
        maxLong: coords.maxLong,
        minLong: coords.minLong,
        userEmail: userEmail,
        type: type
  })
  .exec().then(function(matchResults) {

    //if no match found create a pending roam node
    if (matchResults[0].data.length === 0) {
      console.log('nomatch');

      var searchParams = {
        term: 'Bars',
        limit: 20,
        sort: 0,
        radius_filter: 3200, //2-mile radius
        bounds: coords.maxLat + ',' + coords.minLong + '|' +  coords.minLat  + ',' + coords.maxLong
      };

      //Creates the YELP object to make API request to yelp servers
      yelp.searchYelp(searchParams, function(venue) {

        var venueName = venue.name;
        var venueAddress = venue.location.display_address.join(' ');

        //Create a roam node if it doesn't exist
        apoc.query('CREATE \
          (m:Roam { \
            creatorEmail: "%userEmail%", \
            creatorLatitude: %userLatitude%, \
            creatorLongitude: %userLongitude%, \
            creatorRoamStart: %startRoam%, \
            creatorRoamEnd: %roamOffAfter%, \
            status: "Pending", \
            venueName: "%venueName%", \
            venueAddress: "%venueAddress%", \
            type: "%type%" \
          })',
          {
            email: userEmail,
            userEmail: userEmail,
            userLatitude: coords.userLatitude,
            userLongitude: coords.userLongitude,
            startRoam: times.startRoam,
            roamOffAfter: times.roamOffAfter,
            venueName: venueName,
            venueAddress: venueAddress,
            type: type
        })
        .exec().then(function(queryRes) {

          // creates the relationship between creator of roam node and the roam node
          apoc.query('MATCH \
            (n:User {email:"%email%"}), \
            (m:Roam { \
              creatorEmail: "%creatorEmail%", \
              creatorRoamStart: %roamStart% \
            }) \
            CREATE (n)-[r:ATTENDING {host: true}]->(m)',
            {
              email:userEmail,
              creatorEmail: userEmail,
              roamStart: times.startRoam
          })
          .exec().then(function(relationshipRes) {
             console.log('Relationship created', relationshipRes);
             res.send("Created a roam");
          });
        });
      });

		} else { //Roam node found within a similar geographic location
      console.log('Found a match', matchResults[0].data[0].meta[0].id);

      var id = matchResults[0].data[0].meta[0].id;

      //Grabs roam node between similar location, and creates the relationship between node and user
      apoc.query('MATCH \
        (n:User {email:"%email%"}), \
        (m:Roam) \
          WHERE id(m) = %id% \
          SET m.status="Active" \
          CREATE (n)-[r:ATTENDING {host: false}]->(m) \
          RETURN m',
          {email:userEmail, id:id}
        )
      .exec().then(function(roamRes) {
        console.log('Relationship created b/w Users created', roamRes[0].data[0].row[0]);
        var roamInfo = roamRes[0].data[0].row[0];

        var date = formattedDateHtml();

        //Generates an automatic email message
        var mailOptions = {
          from: '"Typos Roam" <typosroam@gmail.com>', // sender address
          bcc: roamInfo.creatorEmail + ',' + userEmail, // List of users who are matched
          subject: 'Your Roam is Ready!', // Subject line
          text: 'Your Roam is at:' + roamInfo.venueName + ' Roam Address: ' + roamInfo.venueAddress, // plaintext body
          html: generateEmail(roamInfo.venueName, roamInfo.venueAddress, date) // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info) {
          if(error){
            return console.log(error);
          }
          console.log('Message sent: ' + info.response);
        });

        res.send("You have been matched");
      });
    }
	});
});

//Cancellation of roam; only the creator has cancellation abilities
app.post('/cancel', function(req, res) {
  var userEmail = req.body.userEmail;
  console.log('useremail is:', userEmail);

  //Finds roam node that user created and cancels it
  apoc.query('MATCH \
      (m:Roam {creatorEmail: "%userEmail%"}) \
      WHERE m.status="Pending" \
      SET m.status="Canceled" \
      RETURN m',
      {userEmail: userEmail}
    )
    .exec().then(function(cancelRes) {

    	console.log('Roam canceled:', cancelRes[0].data[0].row[0]);

      var roamInfo = cancelRes[0].data[0].row[0];

      //Sends cancellation email
      var mailOptions = {
        from: 'Typos Roam" <typosroam@gmail.com>', // sender address
        bcc: roamInfo.creatorEmail + ',' + userEmail,
        subject: 'Your Roam has been canceled!', // Subject line
        text: 'Your Roam at:' + roamInfo.venueName + ' Roam Address: ' + roamInfo.venueAddress + ' has been canceled.', // plaintext body
        html:
        '<div> \
          <h3>Roam Venue: <br>'
            + roamInfo.venueName +
          '</h3> \
        </div> \
        <div> \
          <h3>Roam Address: '
            + roamInfo.venueAddress + ' has been canceled. \
          </h3> \
        </div>' // html body
      };

      // send mail with defined transport object
      transporter.sendMail(mailOptions, function(error, info){
        if(error){
          return console.log(error);
        }
        console.log('Message sent: ' + info.response);
      });

      res.send("Your Roam has been canceled");
  });
});

//endpoint for returning list of Pool/X roams
app.post('/roamList', function(req, res){
  var dateMS = Date.now();
  var userEmail = req.body.userEmail;
  var type = req.body.type;
  var coords = boundingBoxGenerator(req); //bounding box coordinates
  var times = roamOffGenerator(req); //time until roam ends

  console.log('getting all the group roams');
  apoc.query('MATCH (m:Roam) \
      WHERE m.creatorRoamEnd > %currentDate% \
        AND m.status = "Pending" \
        AND m.creatorLatitude < %maxLat% \
        AND m.creatorLatitude > %minLat% \
        AND m.creatorLongitude < %maxLong% \
        AND m.creatorLongitude > %minLong% \
        AND m.creatorEmail <> "%userEmail%" \
        AND m.type = "%type%" RETURN m',
      {
        currentDate: dateMS,
        maxLat: coords.maxLat,
        minLat: coords.minLat,
        maxLong: coords.maxLong,
        minLong: coords.minLong,
        userEmail: userEmail,
        type: type
  })
  .exec().then(function(roamsList){
    console.log(roamsList[0].data);
    //if there are Pool/X roams, send them
    if (roamsList[0].data.length > 0) {
      res.send(JSON.stringify(roamsList[0].data));
    } else {
      var message = 'No ' + type + ' Roams Available';
      res.send(message);
    }
  });
});

app.post('/joinRoam', function(req, res){
  var id = req.body.id;
  var userEmail = req.body.userEmail;
  var type = req.body.type;
  //create a relationship between the selected roam and the user
  apoc.query('MATCH (n:User {email: "%email%"}), (m:Roam) \
      WHERE id(m) = %id% \
      CREATE (n)-[r:ATTENDING {host: false}]->(m) \
      RETURN m',
      {
        id: id,
        email: userEmail
  })
  .exec().then(function(roam){
    res.send("Joined the roam");
  })
})

app.listen(3000, function(){
  console.log('Example app listening on port 3000!');
});
