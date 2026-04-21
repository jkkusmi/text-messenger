-- !!VERY!! BASIC DRAFT, CHANGE LATER
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CHATS
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_group BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CHAT PARTICIPANTS (many-to-many: users <-> chats)
CREATE TABLE chat_participants (
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (chat_id, user_id)
);

-- MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);

-- OPTIONAL CONSTRAINT: enforce DM = max 2 participants
CREATE OR REPLACE FUNCTION enforce_dm_participant_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT is_group FROM chats WHERE id = NEW.chat_id) = false THEN
        IF (SELECT COUNT(*) FROM chat_participants WHERE chat_id = NEW.chat_id) >= 2 THEN
            RAISE EXCEPTION 'Direct chats can only have two participants';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dm_limit
BEFORE INSERT ON chat_participants
FOR EACH ROW
EXECUTE FUNCTION enforce_dm_participant_limit();