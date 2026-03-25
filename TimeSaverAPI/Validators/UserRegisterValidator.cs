using FluentValidation;
using TimeSaverAPI.DTOs;

namespace TimeSaverAPI.Validators
{
    public class UserRegisterValidator: AbstractValidator<UserRegisterDTO>
    {
        public UserRegisterValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Name is required.")
                .MaximumLength(50).WithMessage("Name cannot exceed 50 characters.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("Email format is invalid.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MinimumLength(8).WithMessage("Password must be at least 8 characters long.")
                .Matches("[A-Z]").WithMessage("Password must contain at least one upper character.")
                .Matches("[0-9]").WithMessage("Password must contain at least one number.");

            RuleFor(x => x.Bio)
                .NotEmpty()
                .When(x => x.UserType == Models.UserType.Worker)
                .WithMessage("Bio is required for workers.");
        }
    }
}
