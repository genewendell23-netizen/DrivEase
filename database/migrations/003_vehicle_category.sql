USE drivease_db;

-- Add category only when it is missing; existing vehicle records are preserved.
DELIMITER $$
CREATE PROCEDURE drivease_add_category_if_missing()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'cars'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE cars
      ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'Other';
  END IF;
END$$
DELIMITER ;

CALL drivease_add_category_if_missing();
DROP PROCEDURE drivease_add_category_if_missing;
