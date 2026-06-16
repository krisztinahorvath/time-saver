# time-saver
Time Saver: Small Jobs, Big Impact

## Local admin account setup

An admin account is seeded automatically when the API starts in the **Development** environment. Credentials are read from `appsettings.Development.json` — never from `appsettings.json` or hardcoded values.

### Default dev credentials (already in appsettings.Development.json)

| Field    | Value              |
|----------|--------------------|
| Email    | `admin@dev.local`  |
| Password | `Dev@Admin123!`    |

These credentials exist only in the Development config file and are never deployed to production.

### Customising the local admin account

Edit `TimeSaverAPI/appsettings.Development.json`:

```json
"AdminSeed": {
  "Email": "your-local-admin@example.com",
  "Password": "YourLocalPassword123!"
}
```

Then restart the API. If a user with that email does not exist, it will be created with `UserType.Admin`.

### Using environment variables instead

Set the variables before starting the API — no file changes needed:

**PowerShell:**
```powershell
$env:AdminSeed__Email    = "admin@dev.local"
$env:AdminSeed__Password = "Dev@Admin123!"
dotnet run
```

**Bash / WSL:**
```bash
AdminSeed__Email=admin@dev.local AdminSeed__Password=Dev@Admin123! dotnet run
```

### Production

The seeder is guarded by `app.Environment.IsDevelopment()` and will **never run** outside Development. Admin accounts in production must be created through a secure out-of-band process (direct DB update or a dedicated migration).

### Blocking public Admin registration

The `POST /api/Users/Register` endpoint rejects any request that sets `userType: "Admin"`. Only the startup seeder can create Admin accounts.

