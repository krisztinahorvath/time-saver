using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using TimeSaverAPI.Data;
using TimeSaverAPI.Models;

namespace TimeSaverAPI.Controllers
{
    [Route("api/stripe")]
    [ApiController]
    public class StripeWebhookController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly IConfiguration _config;
        private readonly ILogger<StripeWebhookController> _logger;

        // These statuses definitively end the subscription — deactivate Plus immediately.
        private static readonly HashSet<string> TerminalStatuses =
            new(StringComparer.OrdinalIgnoreCase) { "canceled", "incomplete_expired", "unpaid" };

        // These are transient/payment-retrying states — do NOT deactivate Plus if the
        // user already has a paid-up period (PlusExpiresAt in the future).
        private static readonly HashSet<string> GracePeriodStatuses =
            new(StringComparer.OrdinalIgnoreCase) { "incomplete", "past_due" };

        public StripeWebhookController(
            TimeSaverContext context,
            IConfiguration config,
            ILogger<StripeWebhookController> logger)
        {
            _context = context;
            _config  = config;
            _logger  = logger;
        }

        // POST: api/stripe/webhook  — no JWT; validated by Stripe signature
        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> Webhook()
        {
            Request.EnableBuffering();
            string json;
            using (var reader = new StreamReader(Request.Body, System.Text.Encoding.UTF8, leaveOpen: true))
                json = await reader.ReadToEndAsync();

            var stripeSignature = Request.Headers["Stripe-Signature"].ToString();
            var webhookSecret   = _config["Stripe:WebhookSecret"] ?? "";
            StripeConfiguration.ApiKey = _config["Stripe:SecretKey"] ?? "";

            Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(json, stripeSignature, webhookSecret,
                    throwOnApiVersionMismatch: false);
            }
            catch (StripeException ex)
            {
                _logger.LogWarning("Stripe webhook signature invalid: {Error}", ex.Message);
                return BadRequest(new { message = "Invalid signature." });
            }

            _logger.LogInformation("Stripe webhook: {EventType} ({EventId})", stripeEvent.Type, stripeEvent.Id);

            try
            {
                switch (stripeEvent.Type)
                {
                    case Events.CheckoutSessionCompleted:
                        await HandleCheckoutCompleted(stripeEvent.Data.Object as Stripe.Checkout.Session);
                        break;

                    case Events.CustomerSubscriptionCreated:
                    case Events.CustomerSubscriptionUpdated:
                        // Pass the payload sub for its ID and customerId only — status comes from a fresh fetch
                        await HandleSubscriptionEvent(stripeEvent.Data.Object as Subscription, stripeEvent.Type);
                        break;

                    case Events.CustomerSubscriptionDeleted:
                        await HandleSubscriptionDeleted(stripeEvent.Data.Object as Subscription);
                        break;

                    case Events.InvoicePaymentSucceeded:
                        await HandleInvoiceSucceeded(stripeEvent.Data.Object as Invoice);
                        break;

                    case Events.InvoicePaymentFailed:
                        HandleInvoiceFailed(stripeEvent.Data.Object as Invoice);
                        break;

                    default:
                        _logger.LogDebug("Unhandled Stripe event: {EventType}", stripeEvent.Type);
                        break;
                }
            }
            catch (Exception ex)
            {
                // Return 200 — error is on our side; retrying the same event won't fix it
                _logger.LogError(ex, "Error processing Stripe event {EventType} ({EventId})", stripeEvent.Type, stripeEvent.Id);
            }

            return Ok();
        }

        // ── checkout.session.completed ────────────────────────────────────────────
        // Payment confirmed. Fetch the subscription directly from Stripe
        // (event payload subscription may still be in 'incomplete' at this instant).
        private async Task HandleCheckoutCompleted(Stripe.Checkout.Session? session)
        {
            if (session == null || string.IsNullOrEmpty(session.CustomerId)) return;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.StripeCustomerId == session.CustomerId);
            if (user == null)
            {
                _logger.LogWarning("CheckoutCompleted: no user for customer {CustomerId}", session.CustomerId);
                return;
            }

            if (string.IsNullOrEmpty(session.SubscriptionId))
            {
                _logger.LogWarning("CheckoutCompleted: session {SessionId} has no SubscriptionId", session.Id);
                return;
            }

            // Always store the subscription ID
            user.StripeSubscriptionId = session.SubscriptionId;
            await _context.SaveChangesAsync();

            // Fetch real-time subscription status — don't trust the session payload
            var freshSub = await new SubscriptionService().GetAsync(session.SubscriptionId);
            await ApplySubscriptionStatus(user, freshSub, "checkout.session.completed");
        }

        // ── customer.subscription.created / updated ───────────────────────────────
        // Payload status can be stale (e.g. 'incomplete' arriving after 'active').
        // Fetch fresh from Stripe to get the definitive current status.
        private async Task HandleSubscriptionEvent(Subscription? payloadSub, string eventType)
        {
            if (payloadSub == null || string.IsNullOrEmpty(payloadSub.CustomerId)) return;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.StripeCustomerId == payloadSub.CustomerId);
            if (user == null)
            {
                _logger.LogWarning("{EventType}: no user for customer {CustomerId}", eventType, payloadSub.CustomerId);
                return;
            }

            _logger.LogInformation(
                "{EventType}: payload status={PayloadStatus} for sub {SubId} — fetching fresh from Stripe",
                eventType, payloadSub.Status, payloadSub.Id);

            // Fetch authoritative status directly from Stripe
            var freshSub = await new SubscriptionService().GetAsync(payloadSub.Id);
            await ApplySubscriptionStatus(user, freshSub, eventType);
        }

        // ── customer.subscription.deleted ────────────────────────────────────────
        // Subscription is gone. Deactivate Plus and mark expiry as now.
        private async Task HandleSubscriptionDeleted(Subscription? sub)
        {
            if (sub == null || string.IsNullOrEmpty(sub.CustomerId)) return;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.StripeCustomerId == sub.CustomerId);
            if (user == null) return;

            var prevPlus = user.IsPlusSubscriber;
            user.IsPlusSubscriber = false;
            user.PlusExpiresAt    = DateTime.UtcNow;
            // Keep StripeCustomerId / StripeSubscriptionId for support history

            _logger.LogInformation(
                "SubscriptionDeleted: user {UserId} sub {SubId} | prevPlus={Prev} → Plus=False",
                user.Id, sub.Id, prevPlus);

            await _context.SaveChangesAsync();
        }

        // ── invoice.payment_succeeded ─────────────────────────────────────────────
        // Renewal confirmed. Refresh subscription state from Stripe.
        private async Task HandleInvoiceSucceeded(Invoice? invoice)
        {
            if (invoice == null || string.IsNullOrEmpty(invoice.CustomerId)) return;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.StripeCustomerId == invoice.CustomerId);
            if (user == null) return;

            if (string.IsNullOrEmpty(invoice.SubscriptionId)) return;

            _logger.LogInformation(
                "InvoiceSucceeded: customer {CustomerId} sub {SubId} — fetching fresh subscription",
                invoice.CustomerId, invoice.SubscriptionId);

            var freshSub = await new SubscriptionService().GetAsync(invoice.SubscriptionId);
            await ApplySubscriptionStatus(user, freshSub, "invoice.payment_succeeded");
        }

        // ── invoice.payment_failed ────────────────────────────────────────────────
        // Log only. Stripe retries; subscription moves to past_due then deleted if
        // unresolved. We handle those transitions in subscription.updated / deleted.
        private void HandleInvoiceFailed(Invoice? invoice)
        {
            if (invoice == null) return;
            _logger.LogWarning(
                "InvoicePaymentFailed: customer {CustomerId} — Stripe will retry; no Plus change",
                invoice.CustomerId);
        }

        // ── Core status logic ─────────────────────────────────────────────────────
        // Called with a FRESH subscription fetched directly from Stripe API.
        private async Task ApplySubscriptionStatus(User user, Subscription sub, string trigger)
        {
            var status   = sub.Status;
            var prevPlus = user.IsPlusSubscriber;
            var prevExp  = user.PlusExpiresAt;

            user.StripeSubscriptionId = sub.Id;

            if (status is "active" or "trialing")
            {
                // Definitive active state — activate Plus
                user.IsPlusSubscriber = true;
                user.PlusActivatedAt ??= DateTime.UtcNow;
                user.PlusExpiresAt    = sub.CurrentPeriodEnd == default ? null : sub.CurrentPeriodEnd;
            }
            else if (TerminalStatuses.Contains(status))
            {
                // Subscription is truly over — deactivate immediately
                user.IsPlusSubscriber = false;
                user.PlusExpiresAt    = DateTime.UtcNow;
            }
            else if (GracePeriodStatuses.Contains(status))
            {
                // incomplete / past_due = payment in flight or retrying.
                // Only deactivate if the user has NO paid-up period remaining.
                // If PlusExpiresAt is in the future they already paid for that period
                // — keep Plus active until Stripe retries resolve or the period ends.
                bool hasPaidPeriod = user.PlusExpiresAt != null && user.PlusExpiresAt > DateTime.UtcNow;
                if (!hasPaidPeriod)
                    user.IsPlusSubscriber = false;
                // else: leave IsPlusSubscriber unchanged
            }

            _logger.LogInformation(
                "ApplySubStatus [{Trigger}]: user={UserId} sub={SubId} stripeStatus={Status} " +
                "| prevPlus={PrevPlus} prevExp={PrevExp} → Plus={NewPlus} exp={NewExp}",
                trigger, user.Id, sub.Id, status,
                prevPlus, prevExp,
                user.IsPlusSubscriber, user.PlusExpiresAt);

            await _context.SaveChangesAsync();
        }
    }
}
