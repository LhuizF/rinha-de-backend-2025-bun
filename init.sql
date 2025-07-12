CREATE TABLE processed_payments  (
    id SERIAL PRIMARY KEY,
    correlationId UUID NOT NULL UNIQUE,
    amount BIGINT NOT NULL,
    processor VARCHAR(10) NOT NULL,
    createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_created_at ON processed_payments(createdAt);
