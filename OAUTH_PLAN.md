# OAuth / Social Login Plan

## 1. Scope

Add **Google Sign-In** as the first provider (OAuth 2.0 + OIDC).  
Yahoo and Microsoft use the same OIDC flow — they can be added later with minimal extra work.

---

## 2. Backend changes needed

### 2.1 New NuGet packages
```
Microsoft.AspNetCore.Authentication.Google
```
(Or `Microsoft.AspNetCore.Authentication.OpenIdConnect` for generic OIDC.)

### 2.2 New model columns (requires migration)
```csharp
// User.cs
public string? GoogleId   { get; set; }  // sub claim from Google
public string? PictureUrl { get; set; }  // profile picture URL
```
One migration needed: `Phase7_SocialLogin`.

### 2.3 New endpoint: `POST /api/auth/google`
Accepts the Google **ID token** from the frontend.  
Validates it with Google's public keys (via `GoogleJsonWebSignature.ValidateAsync`).  
Logic:
1. Validate token → extract `sub`, `email`, `name`, `picture`
2. Find existing user by `GoogleId` → return JWT
3. Find existing user by `email` → link Google account → return JWT
4. No existing user → create new account (UserType = Worker by default, changeable in profile)

```csharp
[AllowAnonymous]
[HttpPost("google")]
public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto)
{
    // dto.IdToken = token from Google
}
```

### 2.4 `appsettings.json` additions
```json
"Google": {
  "ClientId": "YOUR_CLIENT_ID.apps.googleusercontent.com"
}
```
The **ClientSecret** is only needed for server-side OAuth flow; for the ID-token approach it is not required on the backend.

---

## 3. Frontend changes needed

### 3.1 New npm package
```
@react-oauth/google
```

### 3.2 `main.tsx` — wrap app
```tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <App />
</GoogleOAuthProvider>
```

### 3.3 `.env.local`
```
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

### 3.4 `Login.tsx` / `Register.tsx` — add button
```tsx
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={async ({ credential }) => {
    const res = await api.post('/auth/google', { idToken: credential });
    // store JWT same as normal login
  }}
  onError={() => setError('Autentificare Google eșuată.')}
/>
```

### 3.5 `AuthContext.tsx`
No structural changes — Google login response returns the same `{ token, refreshToken, user }` shape.

---

## 4. Google Cloud Console setup steps

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project (or reuse existing)
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
4. Application type: **Web application**
5. Authorized JavaScript origins:
   - `http://localhost:5173` (dev)
   - `https://yourdomain.ro` (prod)
6. Authorized redirect URIs: not needed for the ID-token approach
7. Copy **Client ID** → add to `.env.local` and `appsettings.json`

---

## 5. Security risks

| Risk | Mitigation |
|------|-----------|
| Forged ID token | Always validate with `GoogleJsonWebSignature.ValidateAsync` on the backend — never trust client-side only |
| Account takeover via email | Only link by email if the existing account has `EmailConfirmed = true` (or add confirmation flow) |
| Unintended Admin accounts | Social login creates Worker by default; admin cannot be obtained via social login |
| Token replay | Google tokens are short-lived (1h); `ValidateAsync` checks `exp` |
| CORS | Restrict `AllowedOrigins` to known frontend URLs in `Program.cs` |
| Picture URL | Store only the URL, not the image; URL is from `*.googleusercontent.com` — safe to display |

---

## 6. Estimated implementation steps

| Step | Effort |
|------|--------|
| Add NuGet package | 5 min |
| Add User columns + migration | 10 min |
| `GoogleLoginDto` + `/auth/google` endpoint | 30 min |
| Frontend: `@react-oauth/google` + button in Login/Register | 30 min |
| Google Cloud Console setup | 15 min |
| Test end-to-end (login, link, new account) | 30 min |
| **Total** | **~2 hours** |

---

## 7. Adding Yahoo / Microsoft later

Both support OIDC. Steps are identical — different client IDs, different `authority` URL:
- Yahoo: `https://api.login.yahoo.com`
- Microsoft: `https://login.microsoftonline.com/common/v2.0`

The same `/auth/google` pattern can be generalized to `/auth/oidc?provider=yahoo` with a provider lookup table.
