-- Runs once on first Postgres startup when the data volume is empty.
-- Requires: POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB in .env (see docker-compose).
-- Reset DB: docker compose down -v && docker compose up -d

-- USERS (auth: password_hash = bcrypt of client SHA-256 hex digest of UTF-8 password)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- CHATS
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_group BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Many-to-many: users <-> chats
CREATE TABLE chat_participants (
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (chat_id, user_id)
);

-- MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);

-- Direct chats (is_group = false): at most two participants
CREATE OR REPLACE FUNCTION enforce_dm_participant_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM chats c
        WHERE c.id = NEW.chat_id AND c.is_group = false
    ) THEN
        IF (SELECT COUNT(*)::int FROM chat_participants WHERE chat_id = NEW.chat_id) >= 2 THEN
            RAISE EXCEPTION 'Direct chats can only have two participants';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dm_limit
BEFORE INSERT ON chat_participants
FOR EACH ROW
EXECUTE FUNCTION enforce_dm_participant_limit();
