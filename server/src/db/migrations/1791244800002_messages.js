// Messages sent through the contact form.
//
// The length limits repeat the ones in shared/contact.js on purpose: the form and the server
// check them first, and the database is the last line of defence. `body` holds the visitor's
// "message" (the column cannot be called `message` in the plan's naming, and `body` is clearer).
// `ip_hash` is a salted one-way hash, never the address (see docs/database.md).

export const up = (pgm) => {
  pgm.sql(String.raw`
    CREATE TABLE messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
      email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
      subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 150),
      body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
      status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
      ip_hash text CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$'),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX messages_status_created_idx ON messages (status, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql('DROP TABLE messages;');
};
