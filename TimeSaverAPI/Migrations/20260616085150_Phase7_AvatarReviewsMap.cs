using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeSaverAPI.Migrations
{
    /// <inheritdoc />
    public partial class Phase7_AvatarReviewsMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarUrl",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "JobPostId",
                table: "Reviews",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "JobPosts",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "JobPosts",
                type: "float",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_JobPostId",
                table: "Reviews",
                column: "JobPostId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_JobPosts_JobPostId",
                table: "Reviews",
                column: "JobPostId",
                principalTable: "JobPosts",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_JobPosts_JobPostId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_JobPostId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "AvatarUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "JobPostId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "JobPosts");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "JobPosts");
        }
    }
}
