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
    public class BillingController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly IConfiguration _config;
        private readonly ILogger<BillingController> _logger;

        public BillingController(
            TimeSaverContext context,
            IConfiguration config,
            ILogger<BillingController> logger)
        {
            _context = context;
            _config  = config;
            _logger  = logger;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private void ConfigureStripe() =>
            StripeConfiguration.ApiKey = _config["Stripe:SecretKey"] ?? "";

        // GET: api/billing/summary
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var userId = CurrentUserId;

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            // ── Wallet balance: top-ups minus wallet task-payment debits ─────
            var walletCredits = await _context.PaymentTransactions
                .Where(t => t.UserId == userId &&
                            t.Type   == PaymentTransactionType.TopUp &&
                            t.Status == PaymentTransactionStatus.Succeeded)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            var walletDebits = await _context.PaymentTransactions
                .Where(t => t.UserId == userId &&
                            t.Type   == PaymentTransactionType.WalletDebitTaskPayment &&
                            t.Status == PaymentTransactionStatus.Succeeded)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            var walletBalance = walletCredits - walletDebits;

            // ── Worker: released task earnings ────────────────────────────────
            var earningsBalance = await _context.JobPayments
                .Where(jp => jp.WorkerId == userId && jp.Status == JobPaymentStatus.ReleasedToWorker)
                .SumAsync(jp => (decimal?)(jp.WorkerAmount ?? jp.Amount)) ?? 0m;

            // ── Worker: payments currently held (escrow) ──────────────────────
            var pendingHeldPayments = await _context.JobPayments
                .Where(jp => jp.WorkerId == userId && jp.Status == JobPaymentStatus.PaidHeld)
                .SumAsync(jp => (decimal?)(jp.WorkerAmount ?? jp.Amount)) ?? 0m;

            // ── Employer: task payments in escrow (not yet released) ─────────
            var taskPaymentsHeld = await _context.JobPayments
                .Where(jp => jp.EmployerId == userId && jp.Status == JobPaymentStatus.PaidHeld)
                .SumAsync(jp => (decimal?)jp.Amount) ?? 0m;

            // ── Employer: task payments released to workers ───────────────────
            var taskPaymentsReleased = await _context.JobPayments
                .Where(jp => jp.EmployerId == userId && jp.Status == JobPaymentStatus.ReleasedToWorker)
                .SumAsync(jp => (decimal?)jp.Amount) ?? 0m;

            var taskPaymentsMade = taskPaymentsHeld + taskPaymentsReleased;

            // ── Recent transactions: wallet (top-ups + wallet debits) ────────
            var topUpRows = (await _context.PaymentTransactions
                .Where(t => t.UserId == userId &&
                           (t.Type == PaymentTransactionType.TopUp ||
                            t.Type == PaymentTransactionType.WalletDebitTaskPayment))
                .OrderByDescending(t => t.CreatedAt)
                .Take(15)
                .ToListAsync())
                .Select(t => new BillingTxRow(
                    Id:              t.Id,
                    Amount:          t.Amount,
                    Currency:        t.Currency.ToUpperInvariant(),
                    Type:            t.Type == PaymentTransactionType.WalletDebitTaskPayment
                                         ? "WalletDebitTask"
                                         : "TopUp",
                    Status:          t.Status.ToString(),
                    Description:     t.Description,
                    CreatedAt:       t.CreatedAt,
                    JobPostId:       null,
                    JobTitle:        null,
                    StripeTransferId:null));

            // ── Recent transactions: JobPayments as worker ───────────────────
            var workerPayRows = (await _context.JobPayments
                .Include(jp => jp.JobPost)
                .Where(jp => jp.WorkerId == userId &&
                             (jp.Status == JobPaymentStatus.PaidHeld ||
                              jp.Status == JobPaymentStatus.ReleasedToWorker))
                .OrderByDescending(jp => jp.ReleasedAt ?? jp.PaidAt ?? jp.CreatedAt)
                .Take(10)
                .ToListAsync())
                .Select(jp => new BillingTxRow(
                    Id:              jp.Id,
                    Amount:          jp.WorkerAmount ?? jp.Amount,
                    Currency:        jp.Currency.ToUpperInvariant(),
                    Type:            jp.Status == JobPaymentStatus.PaidHeld ? "TaskPaymentEscrow" : "TaskPaymentReceived",
                    Status:          jp.Status.ToString(),
                    Description:     jp.Status == JobPaymentStatus.PaidHeld
                        ? $"Plată securizată pentru '{jp.JobPost?.Title ?? "Job #" + jp.JobPostId}'"
                        : $"Plată primită pentru '{jp.JobPost?.Title ?? "Job #" + jp.JobPostId}'",
                    CreatedAt:       jp.ReleasedAt ?? jp.PaidAt ?? jp.CreatedAt,
                    JobPostId:       jp.JobPostId,
                    JobTitle:        jp.JobPost?.Title,
                    StripeTransferId:jp.StripeTransferId));

            // ── Recent transactions: JobPayments as employer ─────────────────
            var employerPayRows = (await _context.JobPayments
                .Include(jp => jp.JobPost)
                .Where(jp => jp.EmployerId == userId &&
                             (jp.Status == JobPaymentStatus.PaidHeld ||
                              jp.Status == JobPaymentStatus.ReleasedToWorker))
                .OrderByDescending(jp => jp.ReleasedAt ?? jp.PaidAt ?? jp.CreatedAt)
                .Take(10)
                .ToListAsync())
                .Select(jp => new BillingTxRow(
                    Id:              jp.Id,
                    Amount:          jp.Amount,
                    Currency:        jp.Currency.ToUpperInvariant(),
                    Type:            jp.Status == JobPaymentStatus.PaidHeld ? "TaskPaymentHeld" : "TaskPaymentReleased",
                    Status:          jp.Status.ToString(),
                    Description:     jp.Status == JobPaymentStatus.PaidHeld
                        ? $"Plată reținută pentru '{jp.JobPost?.Title ?? "Job #" + jp.JobPostId}'"
                        : $"Plată eliberată pentru '{jp.JobPost?.Title ?? "Job #" + jp.JobPostId}'",
                    CreatedAt:       jp.ReleasedAt ?? jp.PaidAt ?? jp.CreatedAt,
                    JobPostId:       jp.JobPostId,
                    JobTitle:        jp.JobPost?.Title,
                    StripeTransferId:jp.StripeTransferId));

            // ── Merge and sort all transactions ──────────────────────────────
            var allTx = topUpRows
                .Concat(workerPayRows)
                .Concat(employerPayRows)
                .OrderByDescending(t => t.CreatedAt)
                .DistinctBy(t => $"{t.Type}_{t.Id}")
                .Take(10)
                .Select(t => new
                {
                    id               = t.Id,
                    amount           = t.Amount,
                    currency         = t.Currency,
                    type             = t.Type,
                    status           = t.Status,
                    description      = t.Description,
                    createdAt        = t.CreatedAt,
                    jobPostId        = t.JobPostId,
                    jobTitle         = t.JobTitle,
                    stripeTransferId = t.StripeTransferId,
                })
                .ToList();

            return Ok(new
            {
                balance              = walletBalance,
                walletBalance,
                walletDebits,
                earningsBalance,
                pendingHeldPayments,
                taskPaymentsHeld,
                taskPaymentsReleased,
                taskPaymentsMade,
                totalBalance         = walletBalance + earningsBalance,
                currency             = "RON",
                recentTransactions   = allTx,
                hasStripeCustomer    = !string.IsNullOrEmpty(user.StripeCustomerId),
                connectOnboardingComplete = user.StripeConnectOnboardingComplete,
            });
        }

        // GET: api/billing/profile
        [HttpGet("profile")]
        public async Task<IActionResult> GetBillingProfile()
        {
            var bp = await _context.BillingProfiles
                .FirstOrDefaultAsync(b => b.UserId == CurrentUserId);

            if (bp == null)
                return Ok(null);

            return Ok(new
            {
                id           = bp.Id,
                displayName  = bp.DisplayName,
                addressLine1 = bp.AddressLine1,
                city         = bp.City,
                postalCode   = bp.PostalCode,
                country      = bp.Country,
                vatNumber    = bp.VatNumber,
            });
        }

        // POST: api/billing/profile  (upsert)
        [HttpPost("profile")]
        public async Task<IActionResult> UpsertBillingProfile([FromBody] UpsertBillingProfileDto dto)
        {
            var bp = await _context.BillingProfiles
                .FirstOrDefaultAsync(b => b.UserId == CurrentUserId);

            if (bp == null)
            {
                bp = new BillingProfile
                {
                    UserId    = CurrentUserId,
                    CreatedAt = DateTime.UtcNow,
                };
                _context.BillingProfiles.Add(bp);
            }
            else
            {
                bp.UpdatedAt = DateTime.UtcNow;
            }

            bp.DisplayName  = (dto.DisplayName  ?? string.Empty).Trim();
            bp.AddressLine1 = dto.AddressLine1?.Trim();
            bp.City         = dto.City?.Trim();
            bp.PostalCode   = dto.PostalCode?.Trim();
            bp.Country      = dto.Country?.Trim();
            bp.VatNumber    = dto.VatNumber?.Trim();

            await _context.SaveChangesAsync();
            _logger.LogInformation("BillingProfile upserted for user {UserId}", CurrentUserId);

            return Ok(new { message = "Profilul de facturare a fost salvat." });
        }

        // POST: api/billing/create-customer-portal-session
        [HttpPost("create-customer-portal-session")]
        public async Task<IActionResult> CreateCustomerPortalSession()
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound();

            if (string.IsNullOrEmpty(user.StripeCustomerId))
                return BadRequest(new { message = "Nu ai un cont Stripe asociat. Activează Plus sau fă o reîncărcare mai întâi." });

            ConfigureStripe();
            var baseUrl = _config["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";

            var options = new Stripe.BillingPortal.SessionCreateOptions
            {
                Customer  = user.StripeCustomerId,
                ReturnUrl = $"{baseUrl}/billing",
            };

            var portalSession = await new Stripe.BillingPortal.SessionService().CreateAsync(options);
            _logger.LogInformation("Customer portal session created for user {UserId}", CurrentUserId);

            return Ok(new { portalUrl = portalSession.Url });
        }

        // POST: api/billing/create-topup-checkout-session
        [HttpPost("create-topup-checkout-session")]
        public async Task<IActionResult> CreateTopUpCheckoutSession([FromBody] TopUpRequestDto dto)
        {
            if (dto.Amount < 10 || dto.Amount > 5000)
                return BadRequest(new { message = "Suma trebuie să fie între 10 și 5000 RON." });

            ConfigureStripe();

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

            var baseUrl   = _config["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";
            var amountBani = (long)(dto.Amount * 100); // RON → bani

            var sessionOptions = new SessionCreateOptions
            {
                Customer = user.StripeCustomerId,
                Mode     = "payment",
                LineItems =
                [
                    new SessionLineItemOptions
                    {
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency    = "ron",
                            UnitAmount  = amountBani,
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name        = "Reîncărcare sold TimeSaver",
                                Description = $"Adaugă {dto.Amount} RON în soldul tău TimeSaver",
                            },
                        },
                        Quantity = 1,
                    }
                ],
                Metadata   = new Dictionary<string, string>
                {
                    ["purpose"] = "balance_topup",
                    ["userId"]  = user.Id.ToString(),
                },
                SuccessUrl = $"{baseUrl}/billing/topup-success?session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl  = $"{baseUrl}/billing/top-up",
            };

            var session = await new SessionService().CreateAsync(sessionOptions);
            _logger.LogInformation("TopUp checkout session {SessionId} created for user {UserId}, amount {Amount} RON",
                session.Id, CurrentUserId, dto.Amount);

            return Ok(new { checkoutUrl = session.Url });
        }

        // GET: api/billing/transactions
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            pageSize = Math.Clamp(pageSize, 1, 50);
            page     = Math.Max(1, page);

            var query = _context.PaymentTransactions
                .Where(t => t.UserId == CurrentUserId)
                .OrderByDescending(t => t.CreatedAt);

            var total = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    id          = t.Id,
                    amount      = t.Amount,
                    currency    = t.Currency,
                    type        = t.Type.ToString(),
                    status      = t.Status.ToString(),
                    description = t.Description,
                    createdAt   = t.CreatedAt,
                })
                .ToListAsync();

            return Ok(new { items, total, page, pageSize });
        }

        // GET: api/billing/invoices  — fetches from Stripe API
        [HttpGet("invoices")]
        public async Task<IActionResult> GetInvoices()
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound();

            if (string.IsNullOrEmpty(user.StripeCustomerId))
                return Ok(new { invoices = Array.Empty<object>() });

            ConfigureStripe();

            var options = new InvoiceListOptions
            {
                Customer = user.StripeCustomerId,
                Limit    = 20,
            };

            var stripeInvoices = await new InvoiceService().ListAsync(options);

            var invoices = stripeInvoices.Data.Select(inv => new
            {
                id            = inv.Id,
                number        = inv.Number,
                status        = inv.Status,
                amountPaid    = inv.AmountPaid / 100m,
                currency      = inv.Currency?.ToUpperInvariant(),
                created       = inv.Created,
                invoicePdfUrl = inv.InvoicePdf,
                hostedUrl     = inv.HostedInvoiceUrl,
            }).ToList();

            return Ok(new { invoices });
        }

        // GET: api/billing/connect/status
        [HttpGet("connect/status")]
        public async Task<IActionResult> GetConnectStatus()
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound();

            if (string.IsNullOrEmpty(user.StripeConnectAccountId))
                return Ok(new { connected = false, onboardingComplete = false, accountId = (string?)null });

            ConfigureStripe();

            try
            {
                var account = await new AccountService().GetAsync(user.StripeConnectAccountId);
                var complete = account.DetailsSubmitted && account.ChargesEnabled;

                if (complete && !user.StripeConnectOnboardingComplete)
                {
                    user.StripeConnectOnboardingComplete = true;
                    await _context.SaveChangesAsync();
                }

                return Ok(new
                {
                    connected          = true,
                    onboardingComplete = complete,
                    accountId          = user.StripeConnectAccountId,
                    chargesEnabled     = account.ChargesEnabled,
                    payoutsEnabled     = account.PayoutsEnabled,
                    detailsSubmitted   = account.DetailsSubmitted,
                });
            }
            catch (StripeException ex) when (ex.StripeError?.Code == "account_invalid")
            {
                user.StripeConnectAccountId          = null;
                user.StripeConnectOnboardingComplete = false;
                await _context.SaveChangesAsync();
                return Ok(new { connected = false, onboardingComplete = false, accountId = (string?)null });
            }
        }

        // GET: api/billing/job-payments — receipts for task payments (as employer or worker)
        [HttpGet("job-payments")]
        public async Task<IActionResult> GetJobPayments()
        {
            var userId = CurrentUserId;

            var payments = await _context.JobPayments
                .Include(jp => jp.JobPost)
                .Where(jp => jp.EmployerId == userId || jp.WorkerId == userId)
                .OrderByDescending(jp => jp.ReleasedAt ?? jp.PaidAt ?? jp.CreatedAt)
                .Take(50)
                .ToListAsync();

            var rows = payments.Select(jp => new
            {
                id                = jp.Id,
                jobPostId         = jp.JobPostId,
                jobTitle          = jp.JobPost?.Title,
                amount            = jp.Amount,
                platformFeeAmount = jp.PlatformFeeAmount,
                workerAmount      = jp.WorkerAmount,
                currency          = jp.Currency.ToUpperInvariant(),
                status            = jp.Status.ToString(),
                paymentSource     = jp.PaymentSource.ToString(),
                paidAt            = jp.PaidAt,
                releasedAt        = jp.ReleasedAt,
                createdAt         = jp.CreatedAt,
                role              = jp.EmployerId == userId ? "employer" : "worker",
                stripeTransferId  = jp.StripeTransferId,
            }).ToList();

            return Ok(new { items = rows });
        }

        // POST: api/billing/connect/onboarding
        [HttpPost("connect/onboarding")]
        public async Task<IActionResult> StartConnectOnboarding()
        {
            ConfigureStripe();

            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound();

            var baseUrl = _config["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";

            // Create Express account if not already done
            if (string.IsNullOrEmpty(user.StripeConnectAccountId))
            {
                var accountOptions = new AccountCreateOptions
                {
                    Type  = "express",
                    Email = user.Email,
                    Capabilities = new AccountCapabilitiesOptions
                    {
                        Transfers = new AccountCapabilitiesTransfersOptions { Requested = true },
                    },
                    BusinessType = "individual",
                    Metadata     = new Dictionary<string, string> { ["userId"] = user.Id.ToString() },
                };

                var account = await new AccountService().CreateAsync(accountOptions);
                user.StripeConnectAccountId          = account.Id;
                user.StripeConnectOnboardingComplete = false;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Stripe Connect Express account {AccountId} created for user {UserId}",
                    account.Id, user.Id);
            }

            var linkOptions = new AccountLinkCreateOptions
            {
                Account    = user.StripeConnectAccountId,
                RefreshUrl = $"{baseUrl}/billing/connect/refresh",
                ReturnUrl  = $"{baseUrl}/billing/connect/return",
                Type       = "account_onboarding",
            };

            var link = await new AccountLinkService().CreateAsync(linkOptions);
            return Ok(new { onboardingUrl = link.Url });
        }
    }

    // Unified billing transaction row (avoids anonymous-type nullability mismatch in Concat)
    internal sealed record BillingTxRow(
        long     Id,
        decimal  Amount,
        string   Currency,
        string   Type,
        string   Status,
        string?  Description,
        DateTime CreatedAt,
        long?    JobPostId,
        string?  JobTitle,
        string?  StripeTransferId);

    // DTOs scoped to billing controller
    public class UpsertBillingProfileDto
    {
        public string? DisplayName  { get; set; }
        public string? AddressLine1 { get; set; }
        public string? City         { get; set; }
        public string? PostalCode   { get; set; }
        public string? Country      { get; set; }
        public string? VatNumber    { get; set; }
    }

    public class TopUpRequestDto
    {
        public decimal Amount { get; set; }
    }
}
