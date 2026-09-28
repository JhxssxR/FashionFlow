using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FashionFlow.Migrations
{
    /// <inheritdoc />
    public partial class SalePaymentRefNo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentRefNo",
                table: "Sales",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentRefNo",
                table: "Sales");
        }
    }
}
