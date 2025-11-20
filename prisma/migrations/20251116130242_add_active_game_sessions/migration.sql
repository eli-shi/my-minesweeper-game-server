-- CreateTable
CREATE TABLE "ActiveGame" (
    "game_id" TEXT NOT NULL,
    "user_id" TEXT,
    "difficulty" TEXT NOT NULL,
    "board" JSONB NOT NULL,
    "revealed" JSONB NOT NULL,
    "flagged" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'playing',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveGame_pkey" PRIMARY KEY ("game_id")
);

-- CreateIndex
CREATE INDEX "ActiveGame_user_id_idx" ON "ActiveGame"("user_id");

-- CreateIndex
CREATE INDEX "ActiveGame_expires_at_idx" ON "ActiveGame"("expires_at");

-- AddForeignKey
ALTER TABLE "ActiveGame" ADD CONSTRAINT "ActiveGame_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
