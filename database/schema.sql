-- Ruuvi Network Main Database Schema
-- Note: We probably want to use a schema migration tool for this in the future

CREATE TABLE users (
        id INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(320) NOT NULL,
        last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- Tags
CREATE TABLE tags (
        id BIGINT NOT NULL AUTO_INCREMENT,
        owner_id INT NOT NULL,
        name VARCHAR(64) NOT NULL DEFAULT '',
        tag_id VARCHAR(16) NOT NULL,
        picture VARCHAR(2083) NOT NULL DEFAULT '',
        last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        -- Only one user can claim tag
        UNIQUE INDEX tag_idx (tag_id),
        FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

CREATE TABLE shared_tags (
        share_id BIGINT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        tag_id VARCHAR(16) NOT NULL,
        share_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(share_id),
        UNIQUE INDEX share_idx (user_id, tag_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;
