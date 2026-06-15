using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeSaverAPI.Migrations
{
    /// <inheritdoc />
    public partial class Phase3_DiscoveryAndTrust : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.CreateIndex(
                name: "IX_JobPosts_Category",
                table: "JobPosts",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_JobPosts_CreatedAt",
                table: "JobPosts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_JobPosts_Status",
                table: "JobPosts",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JobPosts_Status",
                table: "JobPosts");

            migrationBuilder.DropIndex(
                name: "IX_JobPosts_Category",
                table: "JobPosts");

            migrationBuilder.DropIndex(
                name: "IX_JobPosts_CreatedAt",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Users");
        }
    }
}
