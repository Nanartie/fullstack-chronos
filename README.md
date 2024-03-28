# CHRONOS<br/>
  API based on JS Express<br/>
# How to run<br/>
-npm start<br/>

# Endpoints<br/>

# Authentication module:<br/>
POST /api/auth/register: Register a new user. Required parameters are [login, password, fullName, email, avatar].<br/>
POST /api/auth/login: Log in a user. Required parameters are [login, password]. Only users with a confirmed email can sign in.<br/>
POST /api/auth/logout: Log out an authorized user.<br/>
GET /api/auth/confirm/<token>: Email confirmation.<br/>
POST /api/auth/password-reset: Send a reset link to the user's email. Required parameter is [email].<br/>
POST /api/auth/password-reset/<token>: Changing password with token from [email].<br/>

# User Module:<br/>
GET /api/users: Get all users.<br/>
GET /api/users/<user_id>: Get specified user data.<br/>
GET /api/users/<user_id>/posts: Get all events by user with such id.<br/>
POST /api/users: Create a new user. Required parameters are [login, password, email, role]. This feature must be accessible only for admins.<br/>
POST /api/users/edit: Gain access to the profile editing menu.<br/>
PATCH /api/users/avatar: Upload user avatar.<br/>
PATCH /api/users/<user_id>: Update user data.<br/>
DELETE /api/users/<user_id>: Delete a user.<br/>

# Search Module:<br/>
GET /api/search/users: Search for users by their login.<br/>
GET /api/search/events: Search for events by their name.<br/>

# File Module:<br/>
GET /api/files/<file>: Returns the path to the file by its name.<br/>

# Event Module:<br/>
GET /api/mycalendar/<calendarId>: Return events from calendar.<br/>
GET /api/profilevents/<userId>: Return list of events in user profile.<br/>
POST /api/<calendarId>/events: Creating event in calendar.<br/>
DELETE /api/<eventId>/events: Delete an event.<br/>

# Calendar Module:<br/>
DELETE /api/<calendarId>/calendars: Delete calendar.<br/>
POST/api/<userId>/calendars: Creating calendar.<br/>
GET /api/<calendarID>/userslist: Returns list of users available for adding in calendar.<br/>
GET /api/<calendarID>/users/<currentUserId>: Returns if user is Owner.<br/>
