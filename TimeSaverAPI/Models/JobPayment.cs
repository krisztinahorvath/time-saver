namespace TimeSaverAPI.Models
{
    public enum PaymentSource
    {
        Card   = 0,
        Wallet = 1
    }

    public enum JobPaymentStatus
    {
        NotStarted,
        CheckoutPending,
        PaidHeld,
        ReleasedToWorker,
        RefundPending,
        Refunded,
        Failed
    }

    public class JobPayment
    {
        public long Id { get; set; }

        public long JobPostId { get; set; }
        public JobPost JobPost { get; set; } = null!;

        public long EmployerId { get; set; }
        public User Employer { get; set; } = null!;

        public long? WorkerId { get; set; }
        public User? Worker { get; set; }

        public decimal Amount { get; set; }
        public string Currency { get; set; } = "ron";
        public decimal? PlatformFeeAmount { get; set; }
        public decimal? WorkerAmount { get; set; }

        public string? StripeCheckoutSessionId { get; set; }
        public string? StripePaymentIntentId { get; set; }
        public string? StripeTransferId { get; set; }
        // For wallet payments: the Stripe ChargeId (from TopUp) used as SourceTransaction at release
        public string? StripeTopUpChargeId { get; set; }

        public PaymentSource PaymentSource { get; set; } = PaymentSource.Card;
        public JobPaymentStatus Status { get; set; } = JobPaymentStatus.NotStarted;

        public DateTime CreatedAt { get; set; }
        public DateTime? PaidAt { get; set; }
        public DateTime? ReleasedAt { get; set; }
        public DateTime? RefundedAt { get; set; }
    }
}
