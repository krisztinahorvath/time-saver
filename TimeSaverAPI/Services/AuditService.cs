using TimeSaverAPI.Data;
using TimeSaverAPI.Models;

namespace TimeSaverAPI.Services
{
    public class AuditService : IAuditService
    {
        private readonly TimeSaverContext _context;

        public AuditService(TimeSaverContext context)
        {
            _context = context;
        }

        public async Task LogAsync(long? userId, string action, string entityType, long? entityId, string? details = null)
        {
            try
            {
                _context.AuditLogs.Add(new AuditLog
                {
                    UserId     = userId,
                    Action     = action,
                    EntityType = entityType,
                    EntityId   = entityId,
                    Details    = details,
                    Timestamp  = DateTime.UtcNow,
                });
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Audit logging is best-effort — never break the main flow
            }
        }
    }
}
