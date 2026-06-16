namespace TimeSaverAPI.Services
{
    public interface IAuditService
    {
        Task LogAsync(long? userId, string action, string entityType, long? entityId, string? details = null);
    }
}
