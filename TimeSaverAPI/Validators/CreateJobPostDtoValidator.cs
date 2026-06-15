using FluentValidation;
using TimeSaverAPI.DTOs;

namespace TimeSaverAPI.Validators
{
    public class CreateJobPostDtoValidator : AbstractValidator<CreateJobPostDto>
    {
        public CreateJobPostDtoValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Title is required.")
                .MaximumLength(100).WithMessage("Title cannot exceed 100 characters.");

            RuleFor(x => x.Description)
                .NotEmpty().WithMessage("Description is required.")
                .MaximumLength(2000).WithMessage("Description cannot exceed 2000 characters.");

            RuleFor(x => x.Budget)
                .GreaterThan(0).WithMessage("Budget must be greater than 0.");

            RuleFor(x => x.Category)
                .NotNull().WithMessage("Category is required.")
                .IsInEnum().WithMessage("Invalid category.");

            RuleFor(x => x.Location)
                .NotEmpty().WithMessage("Location is required.")
                .MaximumLength(100).WithMessage("Location cannot exceed 100 characters.");

            RuleFor(x => x.Deadline)
                .GreaterThan(DateTime.UtcNow).WithMessage("Deadline must be in the future.")
                .When(x => x.Deadline.HasValue);

            RuleFor(x => x.SpecialRequirements)
                .MaximumLength(500).WithMessage("Special requirements cannot exceed 500 characters.")
                .When(x => x.SpecialRequirements != null);
        }
    }
}
