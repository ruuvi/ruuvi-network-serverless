-- Ruuvi Network Main Database Schema
-- Note: We probably want to use a schema migration tool for this in the future

CREATE TABLE users (
        id INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(320) NOT NULL,
        PRIMARY KEY(id),
        UNIQUE INDEX email_idx (email)
) ENGINE=INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

CREATE TABLE user_tokens (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        access_token VARCHAR(128) NOT NULL,
        PRIMARY KEY(id),
        UNIQUE INDEX user_token_idx (user_id, access_token),
        FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

CREATE TABLE claimed_tags (
        claim_id BIGINT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        tag_id VARCHAR(16) NOT NULL,
        PRIMARY KEY(claim_id),
        -- Only one user can claim tag
        UNIQUE INDEX claim_idx (tag_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;

CREATE TABLE shared_tags (
        share_id BIGINT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        tag_id VARCHAR(16) NOT NULL,
        PRIMARY KEY(share_id),
        UNIQUE INDEX share_idx (user_id, tag_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE INNODB CHARACTER SET utf8 COLLATE utf8_unicode_ci;