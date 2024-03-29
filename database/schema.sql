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
        last_accessed DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

CREATE TABLE user_settings (
        user_id INT NOT NULL,
        `key` VARCHAR(320) NOT NULL,
        `value` TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id, `key`)
) ENGINE=INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

-- Sensors
CREATE TABLE sensors (
        id BIGINT NOT NULL AUTO_INCREMENT,
        owner_id INT NOT NULL,
        sensor_id VARCHAR(64) NOT NULL,
        -- offsets
        offset_temperature FLOAT NOT NULL DEFAULT 0,
        offset_humidity FLOAT NOT NULL DEFAULT 0,
        offset_pressure FLOAT NOT NULL DEFAULT 0,
        public TINYINT(1) NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        can_share TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY(id),
        -- Only one user can claim a sensor
        UNIQUE INDEX sensor_idx (sensor_id),
        INDEX sensor_public_idx (public, sensor_id),
        INDEX sensor_owner_idx (owner_id, sensor_id),
        FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

-- Sensor Profiles (per user)
CREATE TABLE sensor_profiles (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        sensor_id varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
        user_id int(11) NOT NULL,
        name varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
        picture varchar(2083) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
        is_active tinyint(1) NOT NULL DEFAULT '1',
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        -- Only one user can own a sensor profile
        UNIQUE KEY sensor_user_idx (user_id,sensor_id),
        CONSTRAINT sensor_profiles_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB AUTO_INCREMENT=4732 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

-- Pending shares to unregistered emails
CREATE TABLE pending_shares (
        id INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(320) NOT NULL,
        sensor_id VARCHAR(64) NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        creator_id INT NOT NULL DEFAULT 0,
        deleted TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY(id),
        UNIQUE INDEX email_idx (email, sensor_id)
) ENGINE=INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

-- Alerts
CREATE TABLE sensor_alerts (
        alert_id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        sensor_id VARCHAR(64) NOT NULL,
        alert_type VARCHAR(32) NOT NULL,
        min_value DOUBLE PRECISION NOT NULL DEFAULT 0,
        max_value DOUBLE PRECISION NOT NULL DEFAULT 0,
        counter INT NOT NULL DEFAULT 0,
        enabled TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        triggered TINYINT NOT NULL DEFAULT 0,
        triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        description TEXT NOT NULL,
        PRIMARY KEY (alert_id),
        UNIQUE KEY (user_id, sensor_id, alert_type),
        INDEX sensor_idx (sensor_id)
) ENGINE INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

-- Ruuvi Subscriptions
CREATE TABLE subscriptions (
        user_id INT NOT NULL,
        max_claims INT(11) NOT NULL DEFAULT 25,
        max_shares INT NOT NULL DEFAULT 40,
        max_shares_per_sensor INT NOT NULL DEFAULT 10,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY user_idx (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;
