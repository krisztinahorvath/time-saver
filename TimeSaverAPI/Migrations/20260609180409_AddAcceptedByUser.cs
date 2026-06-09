using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeSaverAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAcceptedByUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "AcceptedByUserId",
                table: "JobPosts",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobPosts_AcceptedByUserId",
                table: "JobPosts",
                column: "AcceptedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_JobPosts_Users_AcceptedByUserId",
                table: "JobPosts",
                column: "AcceptedByUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobPosts_Users_AcceptedByUserId",
                table: "JobPosts");

            migrationBuilder.DropIndex(
                name: "IX_JobPosts_AcceptedByUserId",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "AcceptedByUserId",
                table: "JobPosts");
        }
    }
}
