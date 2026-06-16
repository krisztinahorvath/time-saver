using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using System.Security.Claims;
using TimeSaverAPI.Data;
using TimeSaverAPI.Models;

namespace TimeSaverAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PlusController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly IConfiguration _config;
        private readonly IHostEnvironment _env;
        private readonly ILogger<PlusController> _logger;

        public PlusController(
            TimeSaverContext context,
            IConfiguration config,
            IHostEnvironment env,
            ILogger<PlusController> logger)
        {
            _context = context;
            _config  = config;
            _env     = env;
            _logger  = logger;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private static bool IsActivePlus(User user) =>
            user.IsPlusSubscriber &&
            (user.PlusExpiresAt == null || user.PlusExpiresAt > DateTime.UtcNow);

        // POST: api/plus/create-checkout-session
        [HttpPost("create-checkout-session")]
        public async Task<IActionResult> CreateCheckoutSession()
        {
            var secretKey = _config["Stripe:SecretKey"];
            if (string.IsNullOrWhiteSpace(secretKey) || secretKey.StartsWith("sk_test_REPLACE"))
                return StatusCode(503, new { message = "Plata nu este configurată. Adaugă cheile Stripe în appsettings." });

            StripeConfiguration.ApiKey = secretKey;

            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound();

            // Create or reuse Stripe customer
            if (string.IsNullOrEmpty(user.StripeCustomerId))
            {
                var customerOptions = new CustomerCreateOptions
                {
                    Email    = user.Email,
                    Name     = user.Name,
                    Metadata = new Dictionary<string, string> { ["userId"] = user.Id.ToString() },
                };
                var customer = await new CustomerService().CreateAsync(customerOptions);
                user.StripeCustomerId = customer.Id;
                await _context.SaveChangesAsync();
            }

            var baseUrl = _config["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";
            var priceId  = _config["Stripe:PlusPriceId"];

            var sessionOptions = new SessionCreateOptions
            {
                Customer        = user.StripeCustomerId,
                Mode            = "subscription",
                LineItems       =
                [
                    new SessionLineItemOptions
                    {
                        Price    = priceId,
                        Quantity = 1,
                    }
                ],
                SuccessUrl = $"{baseUrl}/plus/success?session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl  = $"{baseUrl}/plus/cancel",
            };

            var session = await new SessionService().CreateAsync(sessionOptions);
            _logger.LogInformation("Stripe checkout session created {SessionId} for user {UserId}", session.Id, CurrentUserId);

            return Ok(new { checkoutUrl = session.Url });
        }

        // GET: api/plus/status
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound();

            var isActive = IsActivePlus(user);
            var statusMessage = isActive
                ? (user.PlusExpiresAt != null
                    ? $"Plus activ până la {user.PlusExpiresAt:dd.MM.yyyy}"
                    : "Plus activ")
                : "Fără abonament Plus activ";

            return Ok(new
            {
                isPlusSubscriber      = user.IsPlusSubscriber,
                isVerified            = isActive,
                plusActivatedAt       = user.PlusActivatedAt,
                plusExpiresAt         = user.PlusExpiresAt,
                hasStripeSubscription = !string.IsNullOrEmpty(user.StripeSubscriptionId),
                statusMessage,
            });
        }

        // POST: api/plus/activate-dev  — Development environment only
        [HttpPost("activate-dev")]
        public async Task<IActionResult> ActivateDev()
        {
            if (!_env.IsDevelopment())
                return StatusCode(403, new { message = "Disponibil doar în mediul Development." });

            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound();

            user.IsPlusSubscriber = true;
            user.PlusActivatedAt ??= DateTime.UtcNow;
            user.PlusExpiresAt    = DateTime.UtcNow.AddDays(30);

            await _context.SaveChangesAsync();
            _logger.LogWarning("DEV: Plus manually activated for user {UserId}", CurrentUserId);

            return Ok(new { message = "Plus activat (doar pentru development, 30 zile)" });
        }
    }
}
