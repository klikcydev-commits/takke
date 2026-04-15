-- AlterTable
ALTER TABLE "User" ADD COLUMN "auth_user_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "User_auth_user_id_key" ON "User"("auth_user_id");
