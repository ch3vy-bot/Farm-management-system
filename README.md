# smart-farm-management-

#Group members
PETER CHIBWE BIT23117599





An Intelligent Farm Management System (IFMS) providing a centralized, web-based platform to manage agricultural operations, crop and livestock production, inventory, and farm finances.

The Full Farm Management System is one application, not five separate ones stitched together — so it runs on one shared MySQL database, and every module reads and writes to that same database.


Data only exists in one place. A field registered in Farm Management is the same field referenced by Livestock, Storage, and every other module — not a copy. If we each spun up our own database, we'd have five different farms with disconnected field lists, and nothing would connect.
Modules depend on each other's data. Notifications & Alerts can't warn about low stock unless it can read Storage's inventory table. Market & Sales can't record a sale of livestock unless it can read the Livestock module's animal records. A shared database is what makes the system "intelligent" and centralized rather than five disconnected tools.

One schema, agreed on together. We'll maintain a single schema.sql file in the repo. Each person adds their module's tables to it via pull request, nobody creates a duplicate table for data another module already owns (e.g., if Livestock owns the animals table, Market & Sales references it by animal_id instead of copying animal details into its own table).

Foreign keys must match exactly. Because we all point to the same tables, column names and types need to be agreed on before anyone builds against them — a mismatched farm_id type between two modules will break joins across the whole system.

One shared config file. There's a single database connection file (e.g. /config/db.php) that every module's backend code uses. No one hardcodes their own separate connection.
