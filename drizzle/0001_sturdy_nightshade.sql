ALTER TABLE "users"
  ALTER COLUMN "email_verified" DROP NOT NULL,
  ALTER COLUMN "email_verified" SET DATA TYPE boolean
    USING ("email_verified" IS NOT NULL),
  ALTER COLUMN "email_verified" SET DEFAULT false,
  ALTER COLUMN "email_verified" SET NOT NULL;
