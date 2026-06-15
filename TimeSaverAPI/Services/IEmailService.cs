namespace TimeSaverAPI.Services
{
    // Placeholder for future email integration (Gmail / SendGrid / Resend).
    // To enable: implement SmtpEmailService or SendGridEmailService,
    // add credentials to appsettings.json under "EmailSettings",
    // and register the implementation instead of NoOpEmailService in Program.cs.
    public interface IEmailService
    {
        Task SendAsync(string toEmail, string subject, string body);
    }

    public class NoOpEmailService : IEmailService
    {
        public Task SendAsync(string toEmail, string subject, string body) => Task.CompletedTask;
    }
}
