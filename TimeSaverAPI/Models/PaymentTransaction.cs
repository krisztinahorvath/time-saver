namespace TimeSaverAPI.Models
{
    public enum PaymentTransactionType
    {
        TopUp = 0,
        SubscriptionFee = 1,
        WalletDebitTaskPayment = 2
    }

    public enum PaymentTransactionStatus
    {
        Pending,
        Succeeded,
        Failed
    }

    public class PaymentTransaction
    {
        public long Id { get; set; }
        public long UserId { get; set; }
        public User User { get; set; } = null!;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "ron";
        public PaymentTransactionType Type { get; set; }
        public PaymentTransactionStatus Status { get; set; }
        public string? StripePaymentIntentId { get; set; }
        public string? StripeSessionId { get; set; }
        // Populated for TopUp rows after the charge is resolved from Stripe
        public string? StripeChargeId { get; set; }
        // For WalletDebitTaskPayment rows: which TopUp PaymentTransaction funded this task
        public long? TopUpTransactionId { get; set; }
        public PaymentTransaction? TopUpTransaction { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
