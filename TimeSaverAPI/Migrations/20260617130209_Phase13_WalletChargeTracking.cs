using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeSaverAPI.Migrations
{
    /// <inheritdoc />
    public partial class Phase13_WalletChargeTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StripeChargeId",
                table: "PaymentTransactions",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "TopUpTransactionId",
                table: "PaymentTransactions",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeTopUpChargeId",
                table: "JobPayments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_StripeChargeId",
                table: "PaymentTransactions",
                column: "StripeChargeId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_TopUpTransactionId",
                table: "PaymentTransactions",
                column: "TopUpTransactionId");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentTransactions_PaymentTransactions_TopUpTransactionId",
                table: "PaymentTransactions",
                column: "TopUpTransactionId",
                principalTable: "PaymentTransactions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentTransactions_PaymentTransactions_TopUpTransactionId",
                table: "PaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_StripeChargeId",
                table: "PaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_TopUpTransactionId",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "StripeChargeId",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "TopUpTransactionId",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "StripeTopUpChargeId",
                table: "JobPayments");
        }
    }
}
