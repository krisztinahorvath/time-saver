using FluentValidation;
using TimeSaverAPI.DTOs;

namespace TimeSaverAPI.Validators
{
    public class SendMessageDtoValidator : AbstractValidator<SendMessageDto>
    {
        public SendMessageDtoValidator()
        {
            RuleFor(x => x.Content)
                .NotEmpty().WithMessage("Mesajul nu poate fi gol.")
                .MaximumLength(1000).WithMessage("Mesajul nu poate depăși 1000 de caractere.");
        }
    }
}
