using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using TimeSaverAPI.Data;
using TimeSaverAPI.Models;
using PaymentTransactionStatus = TimeSaverAPI.Models.PaymentTransactionStatus;

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

                    case "account.updated":
                        await HandleAccountUpdated(stripeEvent.Data.Object as Account);
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
        // Routes to Plus activation, balance top-up, or task payment based on metadata.purpose.
        private async Task HandleCheckoutCompleted(Stripe.Checkout.Session? session)
        {
            if (session == null || string.IsNullOrEmpty(session.CustomerId)) return;

            var purpose = session.Metadata?.GetValueOrDefault("purpose") ?? "plus_subscription";

            if (purpose == "balance_topup")
            {
                await HandleTopUpCompleted(session);
                return;
            }

            if (purpose == "task_payment")
            {
                await HandleTaskPaymentCompleted(session);
                return;
            }

            // Default: Plus subscription flow
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

        // ── balance_topup checkout completed ─────────────────────────────────────
        private async Task HandleTopUpCompleted(Stripe.Checkout.Session session)
        {
            // Idempotency: one transaction per session
            bool alreadyRecorded = await _context.PaymentTransactions
                .AnyAsync(t => t.StripeSessionId == session.Id);
            if (alreadyRecorded)
            {
                _logger.LogInformation("TopUp session {SessionId} already recorded — skipping", session.Id);
                return;
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.StripeCustomerId == session.CustomerId);
            if (user == null)
            {
                _logger.LogWarning("TopUpCompleted: no user for customer {CustomerId}", session.CustomerId);
                return;
            }

            var amount   = session.AmountTotal.HasValue ? session.AmountTotal.Value / 100m : 0m;
            var currency = session.Currency ?? "ron";

            // Resolve the Charge ID from the PaymentIntent so we can later use it as
            // SourceTransaction when releasing wallet-funded task payments.
            string? chargeId = null;
            if (!string.IsNullOrEmpty(session.PaymentIntentId))
            {
                try
                {
                    var pi = await new PaymentIntentService().GetAsync(
                        session.PaymentIntentId,
                        new PaymentIntentGetOptions { Expand = ["latest_charge"] });
                    chargeId = pi.LatestChargeId ?? pi.LatestCharge?.Id;
                }
                catch (StripeException ex)
                {
                    _logger.LogWarning(ex, "TopUp: could not resolve ChargeId for PI {PiId}", session.PaymentIntentId);
                }
            }

            _context.PaymentTransactions.Add(new PaymentTransaction
            {
                UserId                = user.Id,
                Amount                = amount,
                Currency              = currency,
                Type                  = PaymentTransactionType.TopUp,
                Status                = PaymentTransactionStatus.Succeeded,
                StripeSessionId       = session.Id,
                StripePaymentIntentId = session.PaymentIntentId,
                StripeChargeId        = chargeId,
                Description           = $"Reîncărcare sold {amount:F2} {currency.ToUpperInvariant()}",
                CreatedAt             = DateTime.UtcNow,
            });

            await _context.SaveChangesAsync();
            _logger.LogInformation(
                "TopUp recorded: user {UserId} +{Amount} {Currency} ChargeId={ChargeId}",
                user.Id, amount, currency, chargeId ?? "(none)");
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

        // ── task_payment checkout completed ──────────────────────────────────────
        private async Task HandleTaskPaymentCompleted(Stripe.Checkout.Session session)
        {
            if (!session.Metadata.TryGetValue("jobPaymentId", out var jobPaymentIdStr) ||
                !long.TryParse(jobPaymentIdStr, out var jobPaymentId))
            {
                _logger.LogWarning("TaskPayment webhook: missing jobPaymentId in session {SessionId}", session.Id);
                return;
            }

            // Idempotency: don't process the same session twice
            var alreadyProcessed = await _context.JobPayments
                .AnyAsync(jp => jp.StripeCheckoutSessionId == session.Id &&
                                jp.Status == JobPaymentStatus.PaidHeld);
            if (alreadyProcessed)
            {
                _logger.LogInformation("TaskPayment session {SessionId} already processed — skipping", session.Id);
                return;
            }

            var payment = await _context.JobPayments
                .Include(jp => jp.JobPost)
                .FirstOrDefaultAsync(jp => jp.Id == jobPaymentId);

            if (payment == null)
            {
                _logger.LogWarning("TaskPayment webhook: JobPayment {JobPaymentId} not found", jobPaymentId);
                return;
            }

            payment.Status               = JobPaymentStatus.PaidHeld;
            payment.PaidAt               = DateTime.UtcNow;
            payment.StripePaymentIntentId = session.PaymentIntentId;

            // Keep job InProgress (payment is held, not yet released)
            if (payment.JobPost != null && payment.JobPost.Status == JobStatus.Open)
                payment.JobPost.Status = JobStatus.InProgress;

            await _context.SaveChangesAsync();

            // Notify worker that payment is held securely
            if (payment.WorkerId.HasValue)
            {
                var workerNotificationMsg = payment.JobPost != null
                    ? $"Angajatorul a efectuat plata securizată de {payment.Amount:F2} RON pentru jobul '{payment.JobPost.Title}'. Suma va fi eliberată la finalizare."
                    : $"Angajatorul a efectuat o plată securizată de {payment.Amount:F2} RON.";

                _context.Notifications.Add(new TimeSaverAPI.Models.Notification
                {
                    UserId           = payment.WorkerId.Value,
                    Type             = NotificationType.PaymentHeld,
                    Title            = "Plată securizată",
                    Message          = workerNotificationMsg,
                    RelatedJobPostId = payment.JobPostId,
                    IsRead           = false,
                    CreatedAt        = DateTime.UtcNow,
                });
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation(
                "TaskPayment held: JobPayment {JobPaymentId}, session {SessionId}, amount {Amount} RON",
                jobPaymentId, session.Id, payment.Amount);
        }

        // ── account.updated ───────────────────────────────────────────────────────
        // Fired when an Express connected account updates its details.
        private async Task HandleAccountUpdated(Account? account)
        {
            if (account == null) return;

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.StripeConnectAccountId == account.Id);

            if (user == null)
            {
                _logger.LogDebug("account.updated: no user for Connect account {AccountId}", account.Id);
                return;
            }

            var wasComplete = user.StripeConnectOnboardingComplete;
            var isNowComplete = account.DetailsSubmitted && account.ChargesEnabled;

            if (isNowComplete && !wasComplete)
            {
                user.StripeConnectOnboardingComplete = true;
                await _context.SaveChangesAsync();
                _logger.LogInformation(
                    "Connect account {AccountId} for user {UserId} is now fully onboarded",
                    account.Id, user.Id);
            }
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
