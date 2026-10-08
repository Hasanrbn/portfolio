// Admin accounts and login sessions.
//
// `users`: there is no sign-up endpoint; accounts are created from the command line
// (`npm run admin:create`). `password_hash` holds an argon2id hash, never the password.
// The email is stored in lower case and the database enforces that, so "A@x.org" and
// "a@x.org" can never be two accounts.
//
// `session`: the table connect-pg-simple expects (name and columns are its defaults).
// Sessions live on the server, so deleting a row logs that browser out immediately.

export const up = (pgm) => {
  pgm.sql(String.raw`
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE
        CONSTRAINT users_email_check CHECK (
          char_length(email) BETWEEN 3 AND 254 AND email = lower(email) AND email = btrim(email)
        ),
      password_hash text NOT NULL
        CONSTRAINT users_password_hash_check CHECK (password_hash LIKE '$argon2id$%'),
      role text NOT NULL DEFAULT 'admin' CONSTRAINT users_role_check CHECK (role IN ('admin')),
      last_login_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TRIGGER users_set_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TABLE session (
      sid varchar NOT NULL COLLATE "default" PRIMARY KEY,
      sess json NOT NULL,
      expire timestamp(6) NOT NULL
    );
    CREATE INDEX session_expire_idx ON session (expire);
  `);
};

export const down = (pgm) => {
  pgm.sql('DROP TABLE session; DROP TABLE users;');
};
