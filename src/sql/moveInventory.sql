-- REMOVING WHEN REACHES 0 COUNT
CREATE OR REPLACE FUNCTION remove_moveItem_on_zero()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.count <= 0 THEN
        DELETE FROM "MoveInventory" WHERE "moveId" = NEW."moveId" AND "userId" = NEW."userId";
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_moveInventory_update
AFTER UPDATE ON "MoveInventory"
FOR EACH ROW
EXECUTE FUNCTION remove_moveItem_on_zero();