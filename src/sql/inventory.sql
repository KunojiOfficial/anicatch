-- REMOVING WHEN REACHES 0 COUNT
CREATE OR REPLACE FUNCTION remove_item_on_zero()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.count <= 0 THEN
        DELETE FROM "Inventory" WHERE "itemId" = NEW."itemId" AND "userId" = NEW."userId";
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_inventory_update
AFTER UPDATE ON "Inventory"
FOR EACH ROW
EXECUTE FUNCTION remove_item_on_zero();