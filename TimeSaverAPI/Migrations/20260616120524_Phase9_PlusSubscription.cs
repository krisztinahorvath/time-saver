using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeSaverAPI.Migrations
{
    /// <inheritdoc />
    public partial class Phase9_PlusSubscription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPlusSubscriber",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PlusActivatedAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PlusExpiresAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeCustomerId",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeSubscriptionId",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPlusOnly",
                table: "JobPosts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ProfileVisits",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VisitorUserId = table.Column<long>(type: "bigint", nullable: false),
                    ProfileUserId = table.Column<long>(type: "bigint", nullable: false),
                    VisitedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileVisits_Users_ProfileUserId",
                        column: x => x.ProfileUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProfileVisits_Users_VisitorUserId",
                        column: x => x.VisitorUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProfileVisits_ProfileUserId",
                table: "ProfileVisits",
                column: "ProfileUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileVisits_VisitorUserId_ProfileUserId",
                table: "ProfileVisits",
                columns: new[] { "VisitorUserId", "ProfileUserId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProfileVisits");

            migrationBuilder.DropColumn(
                name: "IsPlusSubscriber",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PlusActivatedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PlusExpiresAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "StripeCustomerId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "StripeSubscriptionId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsPlusOnly",
                table: "JobPosts");
        }
    }
}
