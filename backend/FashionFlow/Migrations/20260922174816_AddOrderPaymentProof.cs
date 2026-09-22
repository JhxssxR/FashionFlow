using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FashionFlow.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderPaymentProof : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentRefNo",
                table: "Orders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProofSubmittedAt",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptImage",
                table: "Orders",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentRefNo",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ProofSubmittedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReceiptImage",
                table: "Orders");
        }
    }
}
