using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeSaverAPI.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIsWorkerColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsWorker",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsWorker",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
