using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FashionFlow.Migrations
{
    /// <inheritdoc />
    public partial class AddPromotionMinSpend : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "MinSpend",
                table: "Promotions",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MinSpend",
                table: "Promotions");
        }
    }
}
