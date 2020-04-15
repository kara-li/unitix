var Event = require('../models/event.js')
var Show = require('../models/show.js')
var User = require('../models/user.js');
var Group = require('../models/group.js');
var Ticket = require('../models/ticket.js')
var User = require('../models/user.js')
var Notification = require('../models/notification.js')

var async = require('async')

var getSplash = function (req, res) {
    res.render('splash.ejs')
}

var getHome = function (req, res) {
    if (req.session.user == null) {
        res.redirect('/login');
    } else {
        res.render('home.ejs');
    }
}


//Login functions

var getLogin = (req, res) => {
    if (req.session.user) {
        res.redirect("/home");
    }
    res.render('login.ejs', {message: ""});
}

var getRegister = (req, res) => {
    res.render('register.ejs', {message: ""});
}

//Checking login details
var checkLogin = (req, res) => {
    Group.findOne({email: req.body.email, password: req.body.password}, (err, user) => {
        if (err) {
            console.log(err);
            res.json({'status': err})
        } else {
            if (!user) {
                res.render('login.ejs', {message: "Invalid email credentials! Try again!"});
            } else {
                req.session.user = req.body.email;
                res.redirect('/home');
            }
        }
    })

}

var getGroup = function (req, res) {
    //req.session.user has the email of the group, so we query for the full object
    Group.findOne({email:req.session.user}, (err, group) => {
        !err && group ? res.send({'status': 'success', 'group': group}) : res.send({'status':err})
    })
}

var getGroupByID = function (req, res) {
    Group.findById(req.query.groupID, (err, group) => {
        !err && group ? res.json({"group":group}) : res.json({"err":err})
    })
}

// helper to find event pre-populated with shows
var getEventWithShows= function(eventID, callback) {
    Event.findById(eventID, (err, event) => {
        if (!err && event) {
            event = event.toJSON();
            var shows = [];
            async.forEach(event.shows, (showID, done) => {
                Show.findById(showID, (err, show) => {
                    if (!err && show) {
                        show = show.toJSON();
                        shows.push(show);
                        done();
                    } else {
                        done();
                    }
                })
            }, () => {
                event.shows = shows;
                callback(null, event);
            });
        } else {
            callback("no such event", null);
        }
    })
}

// TODO: make into helper
var getGroupWithEvents = function (req, res) {
    Group.findOne({email:req.session.user}, (err, group) => {
        if (!err && group) {
            group = group.toJSON();
            var currentEvents = [];
            async.forEach(group.currentEvents, (eventID, done) => {
                getEventWithShows(eventID, (err, event) => {
                    if (!err && event) {
                        currentEvents.push(event);
                    }
                    done();
                })
            }, () => {
                group.currentEvents = currentEvents;
                res.json({'status':'success',"group":group});
            });
        } else {
            res.json({'status':err});
        }
    });
}


var getProfile = (req, res) => {
    // console.log("SESSION");
    // console.log(req);
    if (req.session.user) {
        Group.findOne({email: req.session.user}, (err, user) => {
            if (err) {
                res.render({succes: false, error: err})
            } else {
                // console.log(user.bio);
                res.render('profile.ejs', {email: user.email, password: user.password, 
                    displayName: user.displayName, groupType: user.groupType, 
                    bio: user.bio})
            }
        })
    } else {
        res.redirect('/');
    }
}

var getCreateEvent = function (req, res) {
    if (req.session.user == null) {
        res.redirect('/login');
    }
    res.render('create_event.ejs', {"group_email": req.session.user})
}

var getTicket = function (req, res) {
        var ticketID = req.query.ticketID
        Ticket.findById(ticketID, (err, ticket) => {
            !err && ticket ? res.json({ "ticket": ticket }) : res.json({ "err": err })
        })
    }

// use to test db saving
var listEvents = function (req, res) {
    Event.find((err, allEvents) => {
        if (err) {
            res.json({ 'status': err })
        } else if (allEvents.length == 0) {
            res.json({ 'status': 'no events' })
        } else {
            res.json({
                'status': 'success',
                'events': allEvents
            })
        }
    })
}

var listEventsWithShows = function (_, res) {
    Event.find((err, allEvents) => {
        if (err) {
            res.json({ 'status': err })
        } else if (allEvents.length == 0) {
            res.json({ 'status': 'no events' })
        }
        events = [];
        async.forEach(allEvents, (event, done) => {
            event = event.toJSON();
            getEventWithShows(event._id, (err, event) => {
                if (!err && event) {
                    events.push(event);
                }
                done();
            })}, () => {
            res.json({
                'status': 'success',
                'events': events
            })
        })
    });
}



// use to test db saving
var listShows = function (req, res) {
    Show.find((err, allShows) => {
        if (err) {
            res.json({ 'status': err })
        } else if (allShows.length == 0) {
            res.json({ 'status': 'no events' })
        } else {
            res.json({
                'status': 'success',
                'shows': allShows
            })
        }
    })
}

// route will wipe Event DB
var clearAllEvents = function (req, res) {
    callback = function () { console.log("done") }
    Event.remove({}, callback)
    Show.remove({}, callback)
    res.json("finished")
}


var createShows = function (req, res) {
    showSchemaIDs = []

    // create and save each show asynchronously. once mongo finishes saving the show, move on to the next one. won't send back id list until all are processed.
    async.forEach(req.body.shows, function (show, done) {
        var newShow = new Show({
            name: show.name,
            capacity: show.capacity,
            tickets_sold: 0, // shows start with zero tickets sold
            price: show.price,
            location: show.location,
            description: show.description,
            start_date: show.date,
            end_date: show.date, // right now i'm assuming only one date, if add end date later we need to reconfigure how we store times (prob just array)
            start_time: show.startTime,
            end_time: show.endTime
        })

        newShow.save((err, showSaved) => {
            if (err) {
                res.json({ 'status': err })
            } else {
                console.log("show id: " + showSaved._id)
                showSchemaIDs.push(showSaved._id)
                done()
            }
        })
    }, function () {
        // send back list of ids
        res.send(showSchemaIDs, 200)
    })


}

// handle post request for event creation. not async bc only one thing occurs and we return from its callback.
var createEvent = function (req, res) {
    var newEvent = new Event({
        name: req.body.name,
        group: req.body.group,
        shows: req.body.shows,
        tags: req.body.tags
    })

    newEvent.save((err, eventSaved) => {
        if (err) {
            res.json({ 'status': err })
        } else {
            res.json({ 'status': 'success', 'eventID': eventSaved._id })
        }
    })
}

// TODO: need to talk to Michael about how adding tags will work
var addEventTag = function (req, res) {
    //TODO: Implement for real
    res.render('create_event.ejs')
}

var createGroup = (req, res) => {
    // console.log("BODY");
    // console.log(req.body);
    const { body } = req.body;
    var newUser = new Group({
        displayName: req.body.groupName,
        email: req.body.email,
        password: req.body.password,
        currentEvents: [],
        pastEvents: [],
        groupType: req.body.groupType,
        bio: req.body.groupBio,
        followers: 0
    })
    Group.findOne({email: req.body.email}, (err, user) => {
        if (err) {
            console.log(err);
            res.json({'status': err})
        } else {
            if (!user){
                console.log("No user exists!");
                newUser.save((err) => {
                    if (err) {
                        res.json({'status': err})
                    } else {
                        res.redirect('/home');
                    }
                })
            } else {
                console.log('Group already exists!');
                res.render('register.ejs', {message: 'Group already exists!'});
            }
        }
    })

}

var updateGroup = (req, res) => {
    // console.log("REQ");
    // console.log(req.body);
    // console.log(req.session.user);
    Group.findOneAndUpdate({email: req.session.user}, {password: req.body.password,
    displayName: req.body.groupName, groupType: req.body.groupType, bio: req.body.bio}, {new: true}, (err, user) => {
        if (err) {
            res.json({'status': err})
        } else {
            res.redirect('/profile');
        }
    })
}

var getLogout = function(req, res) {
    if (req.session.user){
        req.session.destroy();
    }
    res.redirect('/');
};

var purchaseTicket = function (req, res) {
    var showID = req.body.showID;
    var queryEmail = req.body.email;

    // first get user by given email
    User.findOne({ email: queryEmail }, (err, user) => {
        if (err) {
            res.json({ "status": err })
        } else if (!user) {
            res.json({ 'status': 'user not found' })
        } else {
            // if user is found, get the show
            Show.findById(showID, (err, show) => {
                if (err || !show) {
                    res.json({ "status": (err ? err : "show not found") });
                } else {
                    var tickets_sold = show.tickets_sold;
                    // if the show is found, make sure there are tickets available
                    if (!tickets_sold) {
                        tickets_sold = 0;
                    }
                    if (tickets_sold < show.capacity) {
                        // if there are tickets available, create a new ticket
                        var newTicket = new Ticket({
                            show: show._id,
                            redeemed: false,
                            requested: false,
                            customer: user.first_name + " " + user.last_name ,
                            user: user._id
                        });

                        newTicket.save((err, ticket) => {
                            if (err) {
                                res.json({ "status": err });
                            } else {
                                // add ticket to user's tickets
                                var tickets = user.curr_tickets;
                                tickets.push(ticket._id);
                                user.update({ curr_tickets: tickets }, (err) => {
                                    if (!err) {
                                        // update tickets sold for show
                                        var newTickets = show.tickets ? show.tickets : [];
                                        newTickets.push(ticket._id);
                                        show.update({ tickets_sold: tickets_sold + 1, tickets: newTickets }, (err) => {
                                            res.json({ "status": "success" });
                                        });
                                    }
                                })
                            }
                        })


                    } else {
                        // if no tickets, return sold out
                        res.json({ "status": "sold out" });
                    }
                }
            })
        }
    })
}

var requestTicket = function(req, res) {
    var ticketID = req.body.ticketID;
    Ticket.findByIdAndUpdate(ticketID, {requested : true}, (err) => {
        if (err) {
            res.json({"status":err})
        } else {
            res.json({"status":"success"});
        }
    })

}

var findEventWithShows = function (req, res) {
    var eventID = req.query.eventID;
    getEventWithShows(eventID, (err, event) => {
        if (err || !event) {
            res.json({ "status": "failure" });
        } else {
            res.json({
                "status": "success",
                "event": event
            });
        }
    })
}

var getSearchResultEvents = function (req, res) {
    var query = req.query.searchQuery;
    console.log("**************" + query);

    //TODO: COME BACK AND CHANGE "group" to "group_name" once that is updated in event creation
    Event.find({ $or: [ {name:{$regex: ".*" + query + ".*"}}, {group:{$regex: ".*" + query + ".*"}} ] }, (err, allEvents) => {
        if (err) {
            res.json({ 'status': err })
        } else if (allEvents.length == 0) {
            res.json({ 'status': 'no events' })
        } else {
            events = [];
            async.forEach(allEvents,
                (event, done1) => {
                    event = event.toJSON();
                    var shows = []; // will contain actual shows
                    async.forEach(event.shows, (showID, done2) => {
                        Show.findById(showID, (err, show) => {
                            if (!err && show) {
                                console.log(show.toJSON());
                                shows.push(show.toJSON());
                            } else {
                                console.log(err);
                            }
                            done2();
                        });
                    }, () => {
                        event.shows = shows; // replace ID's with actual shows
                        events.push(event);
                        done1();
                    });
                }, () => {
                    res.json({
                        'status': 'success',
                        'events': events
                    })
                })
        }

    });
    // Event.find({ $or: [ { "name":{$regex:".*" + query + ".*"} }, 
    // { "group_name":{$regex:".*" + query + ".*"} } ] }, (err, allEvents) => {
        
}

var getEvent = function (req, res) {
    var eventID = req.query.eventID
    Event.findById(eventID, (err, event) => {
        if (err || !event) {
            res.json({ "status": "failure" })
        } else {
            event = event.toJSON()
            res.json({
                "status": "success",
                "showIDs": event.shows
            })
        }
    })
}

var addEventIdToShow = function (req, res) {
    var eventID = req.body.eventID
    var showID = req.body.showID
    console.log("showID: " + showID)
    console.log("eventID: " + eventID)
    Show.findById(showID, (err, show) => {
        if (err || !show) {
            res.json({ "status": "failure" })
        } else {
            console.log(show)
            show.update({ event: eventID }, (err) => {
                !err ? res.json({ "status": "success" }) : res.json({"status":"failure"})
            });
        }
    })
}

var addEventIdToGroup = function (req, res) {
    var eventID = req.body.eventID
    var groupEmail = req.body.groupEmail
    console.log("ADDING EVENT ID TO GROUP")
    Group.findOne({email:groupEmail}, (err, group) => {
        if (err || !group) {
            res.json({"status":"failure finding group"})
        } else {
            currentEventsUpdated = group.currentEvents
            currentEventsUpdated.push(eventID)
            group.update({currentEvents: currentEventsUpdated}, (err) => {
                !err ? res.json({ "status": "success" }) : res.json({"status":"failure"})
            })
        }
    })
}

var createUser = function (req, res) {
    console.log("creating user " + req.body.email);

    var newUser = new User({
        email: req.body.email,
        password: req.body.password,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        phone: req.body.phone,
        following: [],
        past_tickets: [],
        curr_tickets: [],
        saved_tickets: []

    })
    newUser.save((err) => {
        if (err) {
            res.json({ 'status': err })
        } else {
            res.json({ 'status': 'success' })
        }
    })
}
//find the user and then using json returned check if passwords match
var findUser = function (req, res) {
    console.log(req.query.email + ", " + req.query.password)
    var searchEmail = req.query.email;

    User.findOne({ email: searchEmail }, (err, user) => {
        if (err) {
            res.json({ 'status': err })
        } else if (!user) {
            res.json({ 'status': 'user not found' })
        } else {
            res.json({
                'status': 'user found',
                'user': user
            })
        }
    })
}

var updateUser = function (req, res) {

    User.findOneAndUpdate({email: req.body.email}, {$set: {password: req.body.password,
         first_name: req.body.first_name, last_name: req.body.last_name, phone: req.body.phone}}, (err, user) => {
        if (err) {
            res.json({'status': err})
        } else {
            res.json({ 'status': 'success' })
        }
    })
}

function getAllTickets(ticketIDs, callback) {
    var tickets = []; // array of ticket objects
    async.forEach(ticketIDs, (ticketID, done) => {
        Ticket.findById(ticketID, (err, ticket) => {
            if (!err && ticket) {
                ticket = ticket.toJSON();
                tickets.push(ticket);
            }
            done();
        })
    }, () => {
        // no error since will always return at least empty array
        callback(tickets);
    });
}

function getShowWithTickets(req, res) {
    var showID = req.query.showID;
    console.log("SHOW ID " + showID);
    Show.findById(showID, (err, show) => {
        if (!err && show) {
            show = show.toJSON();
            var ticketIDs = show.tickets ? show.tickets : [];
            getAllTickets(ticketIDs, (tickets) => {
                show.tickets = tickets;
                res.json({"status":"success", "show":show});
            });
        } else {
            res.json({"status":"error"})
        }
    });
}

var getUserTickets = function(req, res) {
    var email = req.query.email;
    User.findOne({"email":email}, (err, user) => {
        user = user.toJSON();
        if (!err && user) {
            var ticketIDs = user.curr_tickets ? user.curr_tickets : [];
            getAllTickets(ticketIDs, (tickets) => {
                res.json({"status":"success","tickets":tickets})
            });
        } else {
            res.json({"status":"error"})
        }
    })
}

// TODO: is this gonna change to be different from one above?
var getUserShowInfo = function(req, res) {
    var email = req.query.email;
    User.findOne({"email":email}, (err, user) => {
        user = user.toJSON();
        if (!err && user) {
            var tickets = [];
            async.forEach(user.curr_tickets, (ticketID, done) => {
                Ticket.findById(ticketID, (err, ticket) => {
                    ticket = ticket.toJSON();
                    if (!err && ticket) {
                        tickets.push(ticket);
                    }
                    done();
                })
            }, () => {
                res.json({"status":"success","tickets":tickets})
            });
        } else {
            res.json({"status":"error"})
        }
    })
}

var createNotification = function(req, res) {
    var userID = req.body.userID;
    var content = req.body.content;
    // calls helper which also handles user side
    addNotification(userID, content, (err, notification) => {
        if (!err && notification) {
            res.json({
                "status":"success", 
                "notification":notification
            });
        } else {
            res.json({"status":"error"});
        }
    })
}

var addNotification = function(userID, content, callback) {
    var newNotification = new Notification({
        content: content
    })
    newNotification.save((err, notification) => {
        if (err || !notification) {
            callback("error", null);
        } else {
            User.findById(userID, (err, user) => {
                if (err || !user) {
                    callback("error", null);
                } else {
                    user = user.toJSON();
                    notification = notification.toJSON();
                    // get notifications if exist
                    var notifications = user.notifications ? user.notifications : [];
                    // add notification to list
                    notifications.push(notification._id);
                    User.findByIdAndUpdate(userID, {"notifications":notifications}, (err, user) => {
                        if (!err && user) {
                            // send back notification
                            callback(null, notification);
                        } else {
                            callback("error", null);
                        }
                    })

                }
            });
        }
    });

}

function getUserNotifications(req, res) {
    var email = req.query.email;
    getAllNotifications(email, (err, notifications) => {
        if (err) {
            res.json({"status":"error"})
        } else {
            res.json({
                "status":"success","notifications":notifications
            })
        }
    })
}

function getAllNotifications(email, callback) {
    User.findOne({email:email}, (err, user) => {
        if (err || !user) {
            callback("error", null);
        } else {
            user = user.toJSON();
            var notificationIDs = user.notifications;
            if (!notificationIDs) {
                notificationIDs = [];
            }
            var notifications = [];
            async.forEach(notificationIDs, (notificationID, done) => {
                Notification.findById(notificationID, (err, notification) => {
                    if (!err && notification) {
                        // notification = notification.toJSON();
                        notifications.push(notification);
                    }
                    done();
                })
            }, () => {

                notifications = sortNotifications(notifications);
                callback(null, notifications);
            });

        }
    })
}

function readAllNotifications(req, res) {
    var email = req.body.email;
    User.findOne({email:email}, (err, user) => {
        if (!err && user) {
            user = user.toJSON();
            var notificationIDs = user.notifications;
            if (notificationIDs) {
                async.forEach(notificationIDs, (notificationID, done) => {
                    readNotification(user._id, notificationID, () => {
                        done();
                    })
                }, () => {
                    res.json({"status":"success"});
                });
            }
        }
    });
}

function readNotification(userID, notificationID, callback) {
    Notification.findByIdAndRemove(notificationID, (err, notification) => {
        User.findById(userID, (err, user) => {
            if (!err && user) {
                user = user.toJSON();
                var notifications = user.notifications ? user.notifications : [];
                notifications = notifications.filter((n) => {return n != notificationID});
                User.findByIdAndUpdate(userID, {notifications:notifications}, (err, user) => {
                    callback();
                })
            }
        });
    })
}

function sortNotifications(notifications) {
    // TODO: this does not work!
    notifications = notifications.sort((a, b) => {
        console.log(typeof new Date(a._id.getTimestamp()))
        return -new Date(a._id.getTimestamp()) + new Date(b._id.getTimestamp());
    })
    return notifications;
}

var notifyAllShowTicketHolders = function(showID, content, callback) {
    Show.findById(showID, (err, show) => {
        if (!err && show) {
            var ticketIDs = show.tickets ? show.tickets : [];
            var preface = show.name ? show.name + ": " : "";
            getAllTickets(ticketIDs, (tickets) => {
                async.forEach(tickets, (ticket, done) => {
                    var userID = ticket.user;
                    if (userID) {
                        addNotification(userID, preface + content, (err, _) => {
                            done();
                        })
                    } else {
                        // if ticket has no user
                        done();
                    }

                }, () => {
                    callback(null); // return no error
                });
            })
        } else {
            callback(err);
        }
    });
} 

var notifyShow = function(req, res) {
    var content = req.body.content;
    var showID = req.body.showID;
    notifyAllShowTicketHolders(showID, content, (err) => {
        if (err) {
            res.json({"status":"error"});
        } else {
            res.json({"status":"success"})
        }
    });
}

var notifyEvent = function(req, res) {
    console.log("NOTIFY EVENT RUN");

    var content = req.body.content;
    var eventID = req.body.eventID;
    console.log(content);
    console.log(eventID)
    Event.findById(eventID, (err, event) => {
        if (!err && event) {
            event = event.toJSON();
            async.forEach(event.shows, (showID, done) => {
                notifyAllShowTicketHolders(showID, content, (err) => {
                    if (err) {
                        res.json({"status":"error"});
                    } else {
                        done();
                    }
                });
            }, () => {
                res.json({"status":"success"})
            });
        } else {

        }
    });
}

var redeemTicket = function(req, res) {
    var ticketID = req.body.ticketID;  
    Ticket.findByIdAndUpdate(ticketID, {redeemed: true}, (err) => {
        if (err) {
            console.log(err);
        }
        res.json({"status":(!err ? "success":"error")});
    });
}

module.exports = {
    get_splash: getSplash,
    get_create_event: getCreateEvent,
    create_shows: createShows,
    create_event: createEvent,
    get_event: getEvent,
    add_event_id_to_show: addEventIdToShow,
    add_event_id_to_group: addEventIdToGroup,
    list_events: listEvents,
    list_shows: listShows,
    list_events_with_shows: listEventsWithShows,
    clear_all_events: clearAllEvents,
    get_home: getHome,
    get_login: getLogin,
    create_group: createGroup,
    get_register: getRegister,
    check_login: checkLogin,
    get_logout: getLogout,
    get_profile: getProfile,
    create_user: createUser,
    find_user: findUser,
    update_user: updateUser,
    purchase_ticket: purchaseTicket,
    find_event_with_shows: findEventWithShows,
    update_group: updateGroup,
    get_group: getGroup,
    get_group_by_id: getGroupByID,
    get_group_with_events: getGroupWithEvents,
    get_show_with_tickets: getShowWithTickets,
    request_ticket: requestTicket,
    get_ticket: getTicket,
    get_user_tickets: getUserTickets,
    redeem_ticket: redeemTicket,
    get_search_result_events: getSearchResultEvents,
    get_user_show_info: getUserShowInfo,
    create_notification: createNotification,
    notify_event: notifyEvent,
    notify_show: notifyShow,
    get_user_notifications: getUserNotifications,
    read_all_notifications: readAllNotifications
}
