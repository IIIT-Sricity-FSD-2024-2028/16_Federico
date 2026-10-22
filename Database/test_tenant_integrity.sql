-- Run after generate_database.sql using the same MySQL/MariaDB connection.
-- The procedure succeeds only if a hospital cannot be paired with a different
-- organization's tenant row. It removes the probe row if the constraint fails
-- to reject the mismatch before signaling a test failure.

DROP PROCEDURE IF EXISTS verify_hospital_tenant_constraint;
DELIMITER //
CREATE PROCEDURE verify_hospital_tenant_constraint()
BEGIN
    DECLARE probe_hospital_id INT;
    DECLARE hospital_organization_id INT;
    DECLARE other_organization_id INT;
    DECLARE probe_role_id INT;
    DECLARE probe_email VARCHAR(255);
    DECLARE rejected_by_integrity_constraint BOOLEAN DEFAULT FALSE;

    SELECT hospital_id, organization_id
      INTO probe_hospital_id, hospital_organization_id
      FROM hospitals
      ORDER BY hospital_id
      LIMIT 1;

    SELECT organization_id
      INTO other_organization_id
      FROM organizations
      WHERE organization_id <> hospital_organization_id
      ORDER BY organization_id
      LIMIT 1;

    SELECT role_id INTO probe_role_id FROM roles ORDER BY role_id LIMIT 1;
    SET probe_email = CONCAT('tenant-integrity-probe-', UUID(), '@invalid.test');

    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLSTATE '23000'
            SET rejected_by_integrity_constraint = TRUE;

        INSERT INTO users (name, email, password_hash, role_id, organization_id, hospital_id)
        VALUES ('Tenant Integrity Probe', probe_email, 'probe-only', probe_role_id,
                other_organization_id, probe_hospital_id);
    END;

    IF NOT rejected_by_integrity_constraint THEN
        DELETE FROM users WHERE email = probe_email;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cross-organization hospital reference was accepted';
    END IF;
END//
DELIMITER ;

CALL verify_hospital_tenant_constraint();
DROP PROCEDURE verify_hospital_tenant_constraint;
