-- Let a user actually be deleted after they have added a custom food.
--
-- food_database.created_by referenced profiles(id) with no ON DELETE clause, so it defaulted to
-- NO ACTION: the row held a foreign key into profiles and the delete was refused. Anyone who ever
-- saved a custom food could not have their account removed — which is a support problem, and a
-- right-to-erasure problem anywhere the GDPR or the CPRA applies.
--
-- SET NULL rather than CASCADE on purpose. The food itself is shared reference data that other
-- people's meals and grocery lists point at; deleting the person who first typed in "my protein
-- shake" must not delete the food out from under everyone else. Forgetting who added it is the
-- correct outcome, and `source_id IS NULL AND created_by IS NULL` already describes a
-- user-contributed food of unknown origin (0140).

ALTER TABLE food_database DROP CONSTRAINT IF EXISTS food_database_created_by_fkey;
ALTER TABLE food_database
    ADD CONSTRAINT food_database_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
