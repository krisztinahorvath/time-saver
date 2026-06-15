using FluentValidation;
using TimeSaverAPI.DTOs;

namespace TimeSaverAPI.Validators
{
    public class UpdateUserDtoValidator : AbstractValidator<UpdateUserDto>
    {
        public UpdateUserDtoValidator()
        {
            RuleFor(x => x.Name)
                .MaximumLength(50).WithMessage("Numele nu poate depăși 50 de caractere.")
                .When(x => !string.IsNullOrWhiteSpace(x.Name));

            RuleFor(x => x.Bio)
                .MaximumLength(500).WithMessage("Biografia nu poate depăși 500 de caractere.")
                .When(x => !string.IsNullOrWhiteSpace(x.Bio));
        }
    }
}
