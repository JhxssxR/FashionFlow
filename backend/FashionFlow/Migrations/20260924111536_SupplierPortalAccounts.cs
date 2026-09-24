using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FashionFlow.Migrations
{
    /// <inheritdoc />
    public partial class SupplierPortalAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Superseded by DbSeed.SyncSupplierPortalAccountsAsync (runs every
            // startup): account ownership is enforced in C# with proper
            // password hashing instead of static SQL. Intentionally a no-op.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restore the original contact names (no rows are deleted).
            migrationBuilder.Sql("UPDATE Users SET Name = N'Marco Lim' WHERE SupplierId = (SELECT SupplierId FROM Suppliers WHERE Name = N'Denim Republic PH');");
            migrationBuilder.Sql("UPDATE Users SET Name = N'Lorna Bautista' WHERE SupplierId = (SELECT SupplierId FROM Suppliers WHERE Name = N'Manila Textile Hub');");
            migrationBuilder.Sql("UPDATE Users SET Name = N'Paolo Escaño' WHERE SupplierId = (SELECT SupplierId FROM Suppliers WHERE Name = N'Cebu Garments Co.');");
            migrationBuilder.Sql("UPDATE Users SET Name = N'Aileen Kim' WHERE SupplierId = (SELECT SupplierId FROM Suppliers WHERE Name = N'Baguio Weaves');");
        }
    }
}
