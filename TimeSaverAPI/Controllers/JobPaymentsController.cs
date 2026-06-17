using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using System.Security.Claims;
using TimeSaverAPI.Data;
using TimeSaverAPI.Models;
using TimeSaverAPI.Services;

namespace TimeSaverAPI.Controllers
{
    [Route("api/jobs/{jobPostId}/payments")]
    [ApiController]
    [Authorize]
    public class JobPaymentsController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly IConfiguration _config;
        private readonly INotificationService _notifications;
        private readonly ILogger<JobPaymentsController> _logger;

        private const decimal PlatformFeePercent = 0.05m;

        public JobPaymentsController(
            TimeSaverContext context,
            IConfiguration config,
            INotificationService notifications,
            ILogger<JobPaymentsController> logger)
        {
            _context       = context;
            _config        = config;
            _notifications = notifications;
            _logger        = logger;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private void ConfigureStripe() =>
            StripeConfiguration.ApiKey = _config["Stripe:SecretKey"] ?? "";

        private static bool IsActivePlus(User user) =>
            user.IsPlusSubscriber &&
            (user.PlusExpiresAt == null || user.PlusExpiresAt > DateTime.UtcNow);

        // Commission: 0% for Plus workers, 5% for Free workers
        private static (decimal fee, decimal workerAmount) ComputeFee(decimal amount, User worker) =>
            IsActivePlus(worker)
                ? (0m, amount)
                : (Math.Round(amount * PlatformFeePercent, 2), amount - Math.Round(amount * PlatformFeePercent, 2));

        // GET: api/jobs/{jobPostId}/payments/status
        [HttpGet("status")]
        public async Task<IActionResult> GetPaymentStatus(long jobPostId)
        {
            var job = await _context.JobPosts
                .Include(j => j.Payment)
                .FirstOrDefaultAsync(j => j.Id == jobPostId);

            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });

            if (job.UserId != CurrentUserId && job.AcceptedByUserId != CurrentUserId)
                return Forbid();

            // Compute what the commission would be for wallet-balance display
            decimal? estimatedFeePercent = null;
            bool? workerIsPlus = null;
            if (job.AcceptedByUserId.HasValue)
            {
                var worker = await _context.Users.FindAsync(job.AcceptedByUserId.Value);
                if (worker != null)
                {
                    workerIsPlus       = IsActivePlus(worker);
                    estimatedFeePercent = workerIsPlus.Value ? 0m : PlatformFeePercent * 100m;
                }
            }

            if (job.Payment == null)
                return Ok(new
                {
                    status              = "NotStarted",
                    payment             = (object?)null,
                    workerIsPlus,
                    estimatedFeePercent,
                });

            var p = job.Payment;
            return Ok(new
            {
                status  = p.Status.ToString(),
                payment = new
                {
                    id                = p.Id,
                    amount            = p.Amount,
                    currency          = p.Currency,
                    platformFeeAmount = p.PlatformFeeAmount,
                    workerAmount      = p.WorkerAmount,
                    status            = p.Status.ToString(),
                    paymentSource     = p.PaymentSource.ToString(),
                    paidAt            = p.PaidAt,
                    releasedAt        = p.ReleasedAt,
                    hasStripeTransfer = !string.IsNullOrEmpty(p.StripeTransferId),
                },
                workerIsPlus,
                estimatedFeePercent,
            });
        }

        // POST: api/jobs/{jobPostId}/payments/create-checkout-session
        [HttpPost("create-checkout-session")]
        public async Task<IActionResult> CreateCheckoutSession(long jobPostId)
        {
            var job = await _context.JobPosts
                .Include(j => j.Payment)
                .Include(j => j.User)
                .FirstOrDefaultAsync(j => j.Id == jobPostId);

            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });
            if (job.UserId != CurrentUserId)
                return StatusCode(403, new { message = "Doar angajatorul poate iniția plata." });

            if (job.Status == JobStatus.Completed || job.Status == JobStatus.Cancelled)
                return BadRequest(new { message = "Nu poți plăti un job finalizat sau anulat." });

            if (!job.AcceptedByUserId.HasValue)
                return BadRequest(new { message = "Trebuie să accepți un prestator înainte de a plăti." });

            if (job.Payment is { Status: JobPaymentStatus.PaidHeld or JobPaymentStatus.ReleasedToWorker })
                return BadRequest(new { message = "Plata pentru acest task a fost deja efectuată." });

            ConfigureStripe();

            var employer = await _context.Users.FindAsync(CurrentUserId);
            if (employer == null) return NotFound();

            var worker = await _context.Users.FindAsync(job.AcceptedByUserId.Value);
            if (worker == null) return NotFound(new { message = "Prestatorul nu a fost găsit." });

            // Create or reuse Stripe customer for employer
            if (string.IsNullOrEmpty(employer.StripeCustomerId))
            {
                var customerOptions = new CustomerCreateOptions
                {
                    Email    = employer.Email,
                    Name     = employer.Name,
                    Metadata = new Dictionary<string, string> { ["userId"] = employer.Id.ToString() },
                };
                var customer = await new CustomerService().CreateAsync(customerOptions);
                employer.StripeCustomerId = customer.Id;
                await _context.SaveChangesAsync();
            }

            var amount = (decimal)job.Budget;
            var (platformFee, workerAmount) = ComputeFee(amount, worker);
            var amountBani = (long)(amount * 100);
            var workerIsPlus = IsActivePlus(worker);

            // Create or reuse JobPayment record
            JobPayment payment;
            if (job.Payment == null)
            {
                payment = new JobPayment
                {
                    JobPostId         = jobPostId,
                    EmployerId        = CurrentUserId,
                    WorkerId          = job.AcceptedByUserId,
                    Amount            = amount,
                    Currency          = "ron",
                    PlatformFeeAmount = platformFee,
                    WorkerAmount      = workerAmount,
                    PaymentSource     = PaymentSource.Card,
                    Status            = JobPaymentStatus.CheckoutPending,
                    CreatedAt         = DateTime.UtcNow,
                };
                _context.JobPayments.Add(payment);
            }
            else
            {
                payment                   = job.Payment;
                payment.WorkerId          = job.AcceptedByUserId;
                payment.Amount            = amount;
                payment.PlatformFeeAmount = platformFee;
                payment.WorkerAmount      = workerAmount;
                payment.PaymentSource     = PaymentSource.Card;
                payment.Status            = JobPaymentStatus.CheckoutPending;
            }

            await _context.SaveChangesAsync();

            var baseUrl = _config["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";

            var commissionNote = workerIsPlus
                ? "Prestator Plus: 0% comision — câștig integral."
                : $"Comision platformă: {platformFee:F2} RON (5%). Prestator primește: {workerAmount:F2} RON.";

            var sessionOptions = new SessionCreateOptions
            {
                Customer = employer.StripeCustomerId,
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
                                Name        = $"Plată task: {job.Title}",
                                Description = commissionNote,
                            },
                        },
                        Quantity = 1,
                    }
                ],
                Metadata = new Dictionary<string, string>
                {
                    ["purpose"]      = "task_payment",
                    ["jobPostId"]    = jobPostId.ToString(),
                    ["jobPaymentId"] = payment.Id.ToString(),
                    ["employerId"]   = CurrentUserId.ToString(),
                    ["workerId"]     = (job.AcceptedByUserId ?? 0).ToString(),
                },
                SuccessUrl = $"{baseUrl}/jobs/{jobPostId}?payment=success",
                CancelUrl  = $"{baseUrl}/jobs/{jobPostId}?payment=cancel",
            };

            var session = await new SessionService().CreateAsync(sessionOptions);

            payment.StripeCheckoutSessionId = session.Id;
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Task payment checkout created | Job={JobId} Employer={EmployerId} Amount={Amount} RON " +
                "Fee={Fee} RON WorkerAmount={WorkerAmount} RON WorkerPlus={WorkerIsPlus}",
                jobPostId, CurrentUserId, amount, platformFee, workerAmount, workerIsPlus);

            return Ok(new { checkoutUrl = session.Url });
        }

        // POST: api/jobs/{jobPostId}/payments/pay-from-wallet
        [HttpPost("pay-from-wallet")]
        public async Task<IActionResult> PayFromWallet(long jobPostId)
        {
            var userId = CurrentUserId;

            var job = await _context.JobPosts
                .Include(j => j.Payment)
                .FirstOrDefaultAsync(j => j.Id == jobPostId);

            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });
            if (job.UserId != userId)
                return StatusCode(403, new { message = "Doar angajatorul poate iniția plata." });

            if (job.Status == JobStatus.Completed || job.Status == JobStatus.Cancelled)
                return BadRequest(new { message = "Nu poți plăti un job finalizat sau anulat." });

            if (!job.AcceptedByUserId.HasValue)
                return BadRequest(new { message = "Trebuie să accepți un prestator înainte de a plăti." });

            if (job.Payment is { Status: JobPaymentStatus.PaidHeld or JobPaymentStatus.ReleasedToWorker })
                return BadRequest(new { message = "Plata pentru acest task a fost deja efectuată." });

            var amount = (decimal)job.Budget;

            // Compute net wallet balance (credits - debits)
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

            if (walletBalance < amount)
                return BadRequest(new
                {
                    message = $"Sold insuficient. Disponibil: {walletBalance:F2} RON, necesar: {amount:F2} RON.",
                    walletBalance,
                    required = amount,
                });

            var worker = await _context.Users.FindAsync(job.AcceptedByUserId.Value);
            if (worker == null) return NotFound(new { message = "Prestatorul nu a fost găsit." });

            var (platformFee, workerAmount) = ComputeFee(amount, worker);
            var workerIsPlus = IsActivePlus(worker);

            // ── Select a TopUp charge that can cover the full task amount ────────────
            // Only TopUp rows with a resolved Stripe ChargeId are eligible for automatic transfer.
            // For each eligible TopUp, compute how much is already reserved by other wallet task payments.
            var eligibleTopUps = await _context.PaymentTransactions
                .Where(t => t.UserId == userId &&
                            t.Type   == PaymentTransactionType.TopUp &&
                            t.Status == PaymentTransactionStatus.Succeeded &&
                            t.StripeChargeId != null)
                .OrderBy(t => t.CreatedAt)  // FIFO: oldest charge first
                .ToListAsync();

            // For each TopUp, sum the wallet debits already linked to it
            var topUpIds = eligibleTopUps.Select(t => t.Id).ToList();
            var reservedByTopUp = await _context.PaymentTransactions
                .Where(t => t.TopUpTransactionId != null &&
                            topUpIds.Contains(t.TopUpTransactionId!.Value) &&
                            t.Status == PaymentTransactionStatus.Succeeded)
                .GroupBy(t => t.TopUpTransactionId!.Value)
                .Select(g => new { TopUpId = g.Key, Reserved = g.Sum(t => t.Amount) })
                .ToDictionaryAsync(x => x.TopUpId, x => x.Reserved);

            // Pick the first TopUp (FIFO) whose remaining balance covers the task amount
            PaymentTransaction? selectedTopUp = null;
            foreach (var topUp in eligibleTopUps)
            {
                var reserved  = reservedByTopUp.GetValueOrDefault(topUp.Id, 0m);
                var remaining = topUp.Amount - reserved;
                if (remaining >= amount)
                {
                    selectedTopUp = topUp;
                    break;
                }
            }

            if (selectedTopUp == null)
            {
                return BadRequest(new
                {
                    message = "Fondurile din sold nu sunt încă disponibile pentru transfer. " +
                              "Reîncărcările recente pot fi în curs de procesare — încearcă mai târziu.",
                    walletBalance,
                });
            }

            // Atomic: create JobPayment + debit wallet transaction
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                JobPayment payment;
                if (job.Payment == null)
                {
                    payment = new JobPayment
                    {
                        JobPostId           = jobPostId,
                        EmployerId          = userId,
                        WorkerId            = job.AcceptedByUserId,
                        Amount              = amount,
                        Currency            = "ron",
                        PlatformFeeAmount   = platformFee,
                        WorkerAmount        = workerAmount,
                        PaymentSource       = PaymentSource.Wallet,
                        StripeTopUpChargeId = selectedTopUp.StripeChargeId,
                        Status              = JobPaymentStatus.PaidHeld,
                        CreatedAt           = DateTime.UtcNow,
                        PaidAt              = DateTime.UtcNow,
                    };
                    _context.JobPayments.Add(payment);
                }
                else
                {
                    payment                     = job.Payment;
                    payment.WorkerId            = job.AcceptedByUserId;
                    payment.Amount              = amount;
                    payment.PlatformFeeAmount   = platformFee;
                    payment.WorkerAmount        = workerAmount;
                    payment.PaymentSource       = PaymentSource.Wallet;
                    payment.StripeTopUpChargeId = selectedTopUp.StripeChargeId;
                    payment.Status              = JobPaymentStatus.PaidHeld;
                    payment.PaidAt              = DateTime.UtcNow;
                }

                _context.PaymentTransactions.Add(new PaymentTransaction
                {
                    UserId              = userId,
                    Amount              = amount,
                    Currency            = "ron",
                    Type                = PaymentTransactionType.WalletDebitTaskPayment,
                    Status              = PaymentTransactionStatus.Succeeded,
                    TopUpTransactionId  = selectedTopUp.Id,
                    Description         = $"Plată task din sold: {job.Title}",
                    CreatedAt           = DateTime.UtcNow,
                });

                if (job.Status == JobStatus.Open)
                    job.Status = JobStatus.InProgress;

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }

            _logger.LogInformation(
                "Wallet task payment | Job={JobId} Employer={EmployerId} Amount={Amount} RON " +
                "Fee={Fee} RON WorkerAmount={WorkerAmount} RON WorkerPlus={WorkerIsPlus}",
                jobPostId, userId, amount, platformFee, workerAmount, workerIsPlus);

            await _notifications.NotifyAsync(
                userId:           job.AcceptedByUserId.Value,
                type:             NotificationType.PaymentHeld,
                title:            "Plată securizată",
                message:          $"Angajatorul a efectuat plata din sold pentru jobul '{job.Title}'. Suma va fi eliberată la finalizare.",
                relatedJobPostId: jobPostId);

            return Ok(new
            {
                message      = "Plata din sold a fost procesată cu succes.",
                amount,
                workerAmount,
                platformFee,
                workerIsPlus,
            });
        }

        // POST: api/jobs/{jobPostId}/payments/release
        [HttpPost("release")]
        public async Task<IActionResult> ReleasePayment(long jobPostId)
        {
            var job = await _context.JobPosts
                .Include(j => j.Payment)
                .Include(j => j.User)
                .FirstOrDefaultAsync(j => j.Id == jobPostId);

            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });
            if (job.UserId != CurrentUserId)
                return StatusCode(403, new { message = "Doar angajatorul poate elibera plata." });

            if (!job.AcceptedByUserId.HasValue)
                return BadRequest(new { message = "Niciun prestator acceptat pentru acest job." });

            var payment = job.Payment;
            if (payment == null || payment.Status != JobPaymentStatus.PaidHeld)
                return BadRequest(new { message = "Plata trebuie să fie în starea 'Securizată' pentru a fi eliberată." });

            ConfigureStripe();

            var worker = await _context.Users.FindAsync(job.AcceptedByUserId.Value);
            if (worker == null) return NotFound(new { message = "Prestatorul nu a fost găsit." });

            string? transferId = null;
            string statusMessage;

            if (!string.IsNullOrEmpty(worker.StripeConnectAccountId) && worker.StripeConnectOnboardingComplete)
            {
                try
                {
                    var transferAmount = (long)((payment.WorkerAmount ?? payment.Amount) * 100);

                    TransferCreateOptions transferOptions;

                    if (payment.PaymentSource == PaymentSource.Card &&
                        !string.IsNullOrEmpty(payment.StripePaymentIntentId))
                    {
                        // Card payment: resolve source_transaction from charge so we use
                        // the pending balance from that specific checkout, not available balance.
                        var pi = await new PaymentIntentService().GetAsync(
                            payment.StripePaymentIntentId,
                            new PaymentIntentGetOptions { Expand = ["latest_charge"] });

                        var chargeId = pi.LatestChargeId ?? pi.LatestCharge?.Id;

                        var balance     = await new BalanceService().GetAsync();
                        var ronAvail    = balance.Available.FirstOrDefault(b => b.Currency == "ron")?.Amount ?? 0;
                        var ronPending  = balance.Pending.FirstOrDefault(b => b.Currency == "ron")?.Amount ?? 0;

                        _logger.LogInformation(
                            "ReleasePayment (card) | Job={JobId} PI={PiId} Charge={ChargeId} " +
                            "RON_available={Avail} RON_pending={Pending}",
                            jobPostId, payment.StripePaymentIntentId, chargeId ?? "(null)",
                            ronAvail / 100m, ronPending / 100m);

                        transferOptions = new TransferCreateOptions
                        {
                            Amount            = transferAmount,
                            Currency          = payment.Currency,
                            Destination       = worker.StripeConnectAccountId,
                            TransferGroup     = $"job_{jobPostId}",
                            SourceTransaction = chargeId,
                            Description       = $"Plată task #{jobPostId}: {job.Title}",
                            Metadata          = new Dictionary<string, string>
                            {
                                ["jobPostId"]       = jobPostId.ToString(),
                                ["jobPaymentId"]    = payment.Id.ToString(),
                                ["source"]          = "card",
                                ["chargeId"]        = chargeId ?? "",
                                ["paymentIntentId"] = payment.StripePaymentIntentId,
                            },
                        };
                    }
                    else
                    {
                        // Wallet payment: use the TopUp's Stripe ChargeId as SourceTransaction.
                        // This draws from the pending balance of that specific charge — no need
                        // to wait for the funds to settle into available balance.
                        if (string.IsNullOrEmpty(payment.StripeTopUpChargeId))
                        {
                            // Old wallet payment without a tracked ChargeId (pre-Phase13 data).
                            // Cannot create automatic transfer — requires manual intervention.
                            _logger.LogWarning(
                                "ReleasePayment (wallet) | Job={JobId} | no StripeTopUpChargeId — manual transfer required",
                                jobPostId);
                            return StatusCode(409, new
                            {
                                message = "Această plată din sold nu are asociat un ChargeId Stripe. " +
                                          "Transferul nu poate fi efectuat automat. Contactează suportul.",
                            });
                        }

                        _logger.LogInformation(
                            "ReleasePayment (wallet) | Job={JobId} ChargeId={ChargeId} TransferAmount={Amount} RON",
                            jobPostId, payment.StripeTopUpChargeId, (decimal)transferAmount / 100m);

                        transferOptions = new TransferCreateOptions
                        {
                            Amount            = transferAmount,
                            Currency          = payment.Currency,
                            Destination       = worker.StripeConnectAccountId,
                            TransferGroup     = $"job_{jobPostId}",
                            SourceTransaction = payment.StripeTopUpChargeId,
                            Description       = $"Plată task #{jobPostId} (din sold): {job.Title}",
                            Metadata          = new Dictionary<string, string>
                            {
                                ["jobPostId"]       = jobPostId.ToString(),
                                ["jobPaymentId"]    = payment.Id.ToString(),
                                ["source"]          = "wallet",
                                ["topUpChargeId"]   = payment.StripeTopUpChargeId,
                            },
                        };
                    }

                    var transfer = await new TransferService().CreateAsync(transferOptions);
                    transferId    = transfer.Id;
                    statusMessage = "Plata a fost eliberată și transferată prestatorului.";

                    _logger.LogInformation(
                        "Stripe transfer {TransferId} created | Job={JobId} Worker={WorkerId} " +
                        "Amount={Amount} RON Source={Source}",
                        transfer.Id, jobPostId, worker.Id,
                        payment.WorkerAmount ?? payment.Amount,
                        payment.PaymentSource.ToString());
                }
                catch (StripeException ex)
                {
                    _logger.LogError(ex,
                        "Stripe transfer failed | Job={JobId} Source={Source} Code={Code}",
                        jobPostId, payment.PaymentSource, ex.StripeError?.Code);
                    return StatusCode(502, new { message = $"Eroare la transferul Stripe: {ex.Message}" });
                }
            }
            else
            {
                statusMessage = "Plata a fost marcată ca eliberată, dar prestatorul nu are configurat contul de primire plăți. " +
                                "Transferul va fi efectuat manual după configurare.";
                _logger.LogWarning(
                    "Job {JobId} payment released but worker {WorkerId} has no Stripe Connect account",
                    jobPostId, worker.Id);
            }

            payment.Status           = JobPaymentStatus.ReleasedToWorker;
            payment.ReleasedAt       = DateTime.UtcNow;
            payment.StripeTransferId = transferId;
            job.Status               = JobStatus.Completed;

            await _context.SaveChangesAsync();

            await _notifications.NotifyAsync(
                userId:           worker.Id,
                type:             NotificationType.PaymentReleased,
                title:            "Plată eliberată",
                message:          $"Angajatorul a finalizat jobul '{job.Title}' și a eliberat plata de {payment.WorkerAmount ?? payment.Amount:F2} RON.",
                relatedJobPostId: jobPostId);

            return Ok(new { message = statusMessage, transferCreated = transferId != null });
        }
    }
}
