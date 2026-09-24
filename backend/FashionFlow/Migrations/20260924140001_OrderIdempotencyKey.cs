using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FashionFlow.Migrations
{
    /// <inheritdoc />
    public partial class OrderIdempotencyKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: an earlier twin of this migration (since removed)
            // may already have added the column/index on deployed databases.
            migrationBuilder.Sql(@"
IF COL_LENGTH('Orders', 'IdempotencyKey') IS NULL
    ALTER TABLE [Orders] ADD [IdempotencyKey] nvarchar(450) NULL;");
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_IdempotencyKey' AND object_id = OBJECT_ID(N'Orders'))
    CREATE UNIQUE INDEX [IX_Orders_IdempotencyKey] ON [Orders] ([IdempotencyKey]) WHERE [IdempotencyKey] IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_IdempotencyKey' AND object_id = OBJECT_ID(N'Orders'))
    DROP INDEX [IX_Orders_IdempotencyKey] ON [Orders];");
            migrationBuilder.Sql(@"
IF COL_LENGTH('Orders', 'IdempotencyKey') IS NOT NULL
    ALTER TABLE [Orders] DROP COLUMN [IdempotencyKey];");
        }
    }
}
