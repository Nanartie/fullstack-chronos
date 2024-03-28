CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    login VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar VARCHAR(255),
    confirm_token VARCHAR(255),
    confirmed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS calendars (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL DEFAULT 'New Calendar',
    color VARCHAR(255)  DEFAULT '#ffffff',
    description VARCHAR(255),
    date TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL DEFAULT 'New Event',
    color VARCHAR(255)  DEFAULT '#ffffff',
    content VARCHAR(255),
    start TIMESTAMP NOT NULL,
    end TIMESTAMP NOT NULL,
    type VARCHAR(255),
    date TIMESTAMP NOT NULL,
    file VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS usercalendars (
    userId INT NOT NULL,
    calendarId INT NOT NULL,
    isOwner BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (calendarId) REFERENCES calendars(id)
);

CREATE TABLE IF NOT EXISTS userevents (
    userId INT NOT NULL,
    eventId INT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (eventId) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS calendarevents (
    calendarId INT NOT NULL,
    eventId INT NOT NULL,
    FOREIGN KEY (calendarId) REFERENCES calendars(id),
    FOREIGN KEY (eventId) REFERENCES events(id)
);
