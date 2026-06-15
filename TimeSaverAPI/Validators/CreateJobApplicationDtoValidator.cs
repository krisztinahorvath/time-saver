using FluentValidation;
using TimeSaverAPI.DTOs;

namespace TimeSaverAPI.Validators
{
    public class CreateJobApplicationDtoValidator : AbstractValidator<CreateJobApplicationDto>
    {
        public CreateJobApplicationDtoValidator()
        {
            RuleFor(x => x.Message)
                .NotEmpty().WithMessage("Mesajul de aplicare este obligatoriu.")
                .MinimumLength(10).WithMessage("Mesajul trebuie să aibă cel puțin 10 caractere.")
                .MaximumLength(500).WithMessage("Mesajul nu poate depăși 500 de caractere.");

            RuleFor(x => x.JobPostId)
                .GreaterThan(0).WithMessage("Job invalid.");
        }
    }
}
