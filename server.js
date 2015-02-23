
    // set up ========================
    var express  = require('express');
    var app      = express();                               // create our app w/ express
    var mongoose = require('mongoose');                     // mongoose for mongodb
    var morgan = require('morgan');             // log requests to the console (express4)
    var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
    var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)

    var Crawler = require("crawler");

    // configuration =================

    mongoose.connect('mongodb://uni:uni@proximus.modulusmongo.net:27017/Ra6notaw');     // connect to mongoDB database on modulus.io

    app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
    app.use(morgan('dev'));                                         // log every request to the console
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    app.use(methodOverride());

    // listen (start app with node server.js) ======================================
    app.listen(8080);
    console.log("App listening on port 8080");

    // define model =================
  
  var Image = mongoose.model('Image', {
    uri : String,
    seen : Boolean
    });

  var Soup = mongoose.model('Soup', {
    url: String,
    lastPost: String
    });

// routes ======================================================================

    // api ---------------------------------------------------------------------
    app.get('/api/soups', function(req, res) {

        Soup.find(function(err, soups) {
            if (err)
                res.send(err)

            res.json(soups);
        });
    });

    app.post('/api/soups', function(req, res) {
        var fullUrl = req.body.text;

        if (fullUrl.indexOf('http://') != 0) {
            fullUrl = 'http://' + fullUrl; 
        }

        if (fullUrl.indexOf('soup.io') == -1) {
            fullUrl = fullUrl + '.soup.io';
        }

        Soup.create({
            url : fullUrl,
            lastPost : ""
        }, function(err, soup) {
            if (err)
                res.send(err);

            Soup.find(function(err, soups) {
                if (err)
                    res.send(err);
                res.json(soups);
            });
        });
    });

    // delete a soup
    app.delete('/api/soups/:soup_id', function(req, res) {
        Soup.remove({
            _id : req.params.soup_id
        }, function(err, todo) {
            if (err)
                res.send(err);

            // get and return all the todos after you create another
            Soup.find(function(err, soups) {
                if (err)
                    res.send(err)
                res.json(soups);
            });
        });
    });

    app.delete('/api/images/:image_id', function(req, res) {
        Image.remove({
            _id : req.params.image_id
        }, function(err, image) {});
    });

    app.get('/api/images', function(req, res) {
        Soup.find(function(err, soups) {
            if (err)
                res.send(err)

            //crawl for new content
            soups.map(function (soup) {
                var crawler = new Crawler({
                    "maxConnections":5
                });

                crawler.queue([
                {
                    "uri" : soup.url,
                    "callback" : crawlSoup(crawler, soup.url, 1, soup.lastPost, res)
                }]);
                crawler.queue([{
                    "uri" : soup.url,
                    "callback" : updateLastPost(soup)
                }])
            });

            //return all the new images
            Image.find({seen: false}, function(err, images) {
                if (err)
                    res.send(err)
                res.json(images);
            });

            //mark new images as seen
            Image.update({ seen: false }, { seen: true }, { multi: true }, function (err, numberAffected, raw) {
                if (err) console.log("Error on 'seeing'");
                console.log('%d posts seen', numberAffected);
            });
        }); 
    });

    app.get('/soups/clear', function(req, res) {
        Soup.update({}, { lastPost : ""}, { multi: true } , function (err, number, raw) {
            if (err) console.log("Error reseting soups");
            console.log("%d soups cleared", number);
            res.end();
        });
    });
    
    function crawlSoup(crawler, soup, left, lastPost, res) {
        return function(error, result, $) {
            console.log("Checking soup: " + soup);
            $("div.imagecontainer img").each(function (index, a) {
                if (a.attribs.src == lastPost) {
                    console.log("Nothing new here");
                    left = -1;
                }

                if (left != -1) {
                    console.log("Found image: " + a.attribs.src);
                    Image.findOne({ 'uri' : a.attribs.src }, function (err, image) {
                        if (err)
                            console.log("Error finding image");
                        if (!image)
                            Image.create({uri : a.attribs.src, seen : false}, function(err, image) {});
                    });
                }
            });
            $("div#load_more a").each(function (index, a) {
                if (left > 0) {
                    console.log("Found next page: " + a.attribs.href);
                    crawler.queue([{
                        "uri" : soup + a.attribs.href,
                        "callback" : crawlSoup(crawler, soup, left - 1, lastPost, res)
                    }]);
                }
            });
        }
    }

    function updateLastPost(soup) {
        return function(error, result, $) {
            var newLast = $("div.imagecontainer img").slice(0,1)[0];

            if (newLast.attribs.src != soup.lastPost) {
                console.log("New last post: " + newLast.attribs.src);
                
                Soup.update({ 'url' : soup.url }, { 'lastPost' : newLast.attribs.src }, function (err, number, raw) {
                    if (err)
                        console.log("Error updating last post");
                });
            }
        }
    }

    // application -------------------------------------------------------------
    app.get('*', function(req, res) {
        res.sendfile('./public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });