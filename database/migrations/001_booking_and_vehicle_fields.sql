-- DrivEase compatibility migration for an EXISTING drivease_db database.
-- Back up the database before running this file. It does not drop or replace data.

DELIMITER $$
CREATE PROCEDURE drivease_add_column_if_missing(
  IN table_name_arg VARCHAR(64),
  IN column_name_arg VARCHAR(64),
  IN column_definition_arg TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = table_name_arg
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = table_name_arg
      AND column_name = column_name_arg
  ) THEN
    SET @migration_sql = CONCAT(
      'ALTER TABLE `', REPLACE(table_name_arg, '`', '``'), '` ADD COLUMN `',
      REPLACE(column_name_arg, '`', '``'), '` ', column_definition_arg
    );
    PREPARE migration_statement FROM @migration_sql;
    EXECUTE migration_statement;
    DEALLOCATE PREPARE migration_statement;
  END IF;
END$$
DELIMITER ;

CALL drivease_add_column_if_missing('cars', 'color', 'VARCHAR(80) NULL');
CALL drivease_add_column_if_missing('cars', 'plate_no', 'VARCHAR(30) NULL');
CALL drivease_add_column_if_missing('bookings', 'payment_status', "VARCHAR(30) NOT NULL DEFAULT 'Unpaid'");
CALL drivease_add_column_if_missing('bookings', 'payment_method', 'VARCHAR(30) NULL');
CALL drivease_add_column_if_missing('bookings', 'renter_phone', 'VARCHAR(40) NULL');
CALL drivease_add_column_if_missing('bookings', 'pickup_location', 'VARCHAR(255) NULL');
CALL drivease_add_column_if_missing('bookings', 'return_location', 'VARCHAR(255) NULL');

DROP PROCEDURE drivease_add_column_if_missing;
