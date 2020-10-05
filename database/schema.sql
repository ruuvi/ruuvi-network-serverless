-- Ruuvi Network Main Database Schema
-- Note: We probably want to use a schema migration tool for this in the future

CREATE TABLE users (
        id INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(320) NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        UNIQUE INDEX email_idx (email)
) ENGINE=INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

CREATE TABLE user_tokens (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        access_token VARCHAR(128) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        UNIQUE INDEX user_token_idx (user_id, access_token),
        FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

CREATE TABLE reset_tokens (
        id INT NOT NULL AUTO_INCREMENT,
        short_token VARCHAR(16) NOT NULL DEFAULT '',
        long_token TEXT NOT NULL,
        issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME,
        PRIMARY KEY(short_token),
        UNIQUE KEY(id)
) ENGINE=INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

-- Sensors
CREATE TABLE sensors (
        id BIGINT NOT NULL AUTO_INCREMENT,
        owner_id INT NOT NULL,
        name VARCHAR(64) NOT NULL DEFAULT '',
        sensor_id VARCHAR(16) NOT NULL,
        picture VARCHAR(2083) NOT NULL DEFAULT '',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        -- Only one user can claim a sensor
        UNIQUE INDEX sensor_idx (sensor_id),
        FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

CREATE TABLE shared_sensors (
        share_id BIGINT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        sensor_id VARCHAR(16) NOT NULL,
        shared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(share_id),
        UNIQUE INDEX share_idx (user_id, sensor_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;
