using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TimeSaverAPI.Data;
using TimeSaverAPI.Models;

namespace TimeSaverAPI.Services
{
    public static class AdminSeeder
    {
        /// <summary>
        /// Creates the development admin account if it does not already exist.
        /// Reads credentials from AdminSeed:Email / AdminSeed:Password in configuration
        /// (set in appsettings.Development.json or as environment variables).
        /// No-ops silently when credentials are not configured.
        /// </summary>
        public static async Task SeedAsync(
            IServiceProvider services,
            IConfiguration   configuration,
            ILogger          logger)
        {
            var email    = configuration["AdminSeed:Email"];
            var password = configuration["AdminSeed:Password"];

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                logger.LogWarning(
                    "AdminSeed skipped: AdminSeed:Email or AdminSeed:Password not set in appsettings.Development.json.");
                return;
            }

            using var scope   = services.CreateScope();
            var context       = scope.ServiceProvider.GetRequiredService<TimeSaverContext>();
            var hasher        = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

            if (await context.Users.AnyAsync(u => u.Email == email))
            {
                logger.LogInformation("AdminSeed: admin user {Email} already exists — skipping.", email);
                return;
            }

            var admin = new User
            {
                Name      = "Admin",
                Email     = email,
                Bio       = string.Empty,
                UserType  = UserType.Admin,
                CreatedAt = DateTime.UtcNow,
            };
            admin.Password = hasher.HashPassword(admin, password);

            context.Users.Add(admin);
            await context.SaveChangesAsync();

            logger.LogInformation("AdminSeed: created admin user {Email}.", email);
        }
    }
}
