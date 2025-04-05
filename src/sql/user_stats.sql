-- COINS SPENT
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.coins < OLD.coins THEN
        INSERT INTO "UserStats" ("userId", "coinsSpent")
        VALUES (NEW.id, OLD.coins - NEW.coins)
        ON CONFLICT ("userId")
        DO UPDATE SET "coinsSpent" = "UserStats"."coinsSpent" + (OLD.coins - NEW.coins);
    
    IF NEW.gems < OLD.gems THEN
        INSERT INTO "UserStats" ("userId", "gemsSpent")
        VALUES (NEW.id, OLD.gems - NEW.gems)
        ON CONFLICT ("userId")
        DO UPDATE SET "gemsSpent" = "UserStats"."gemsSpent" + (OLD.gems - NEW.gems);

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_user_update
AFTER UPDATE OF coins, encounters ON "User"
FOR EACH ROW
WHEN (OLD.coins > NEW.coins)
EXECUTE FUNCTION update_user_stats();

-- ENCOUNTERED

CREATE OR REPLACE FUNCTION update_encounter_on_card_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "UserStats" ("userId", encountered)
    VALUES (NEW."userId", 1)
    ON CONFLICT ("userId")
    DO UPDATE SET encountered = "UserStats".encountered + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_card_instance_insert
AFTER INSERT ON "CardInstance"
FOR EACH ROW
EXECUTE FUNCTION update_encounter_on_card_insert();

-- CAPTURED

CREATE OR REPLACE FUNCTION update_captured_on_card_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'IDLE' AND OLD.status = 'WILD' THEN
        INSERT INTO "UserStats" ("userId", captured)
        VALUES (NEW."userId", 1)
        ON CONFLICT ("userId")
        DO UPDATE SET captured = "UserStats".captured + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_card_instance_update
AFTER UPDATE ON "CardInstance"
FOR EACH ROW
EXECUTE FUNCTION update_captured_on_card_update();