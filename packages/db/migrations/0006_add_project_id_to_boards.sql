ALTER TABLE "boards" ADD COLUMN "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL;

CREATE INDEX "boards_project_id_idx" ON "boards" ("project_id");
