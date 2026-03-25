# TimeSaverAPI

## Info
We are using .NET 10 with EF Core and an MS SQL database.

When running the server a swagger doc will be generated and opened in the browser.

## Useful links
[Entity Framework Core in ASP.NET Core Web API with SQL Server - Dot Net Tutorials](https://dotnettutorials.net/lesson/entity-framework-core-in-asp-net-core-web-api-with-sql-server/)


[Enterprise Web App Patterns - Azure Architecture Center | Microsoft Learn](https://learn.microsoft.com/en-us/azure/architecture/web-apps/guides/enterprise-app-patterns/overview)


[EF Relationships](https://learn.microsoft.com/en-us/ef/core/modeling/relationships)


## Database 

#### Setup
Create an MS SQL database and duplicate **template.appsettings.json** and name it **appsettings.json**. Do not delete the template and do not remove **appsettings.json** from *.gitignore*.

Update in **appsettings.json** the `ConnectionString` so that it matches your local database setup - you only need to modify the server and the database. 

#### Modifications
We are using an ORM for the database so we won't be writing any SQL queries. You will need to modify the models and the database context appropriately.

To create a migration open the **Package Manager Console** and run this command `Add-Migration <MigrationName>` this will generate the code for updating the database. To perform the actual update run `Update-Database`. 

To remove the last migration use `Remove-Migration`.

## DTOs
They are data transfer objects. You'd probably want to use a DTO for most endpoints. Don't ask the client for information that is not need and don't return information not needed.

## Controllers
The controllers were generated using scaffolding. You can update them/create others as you deem fit. All logic is added in the controllers for simplicity, if there is something very complex you can create a service/utils class in a new folder.

## Validations
Follow the example set in **Validators/UserRegisterValidator.cs**, then you have to add in Program.cs something like this `builder.Services.AddValidatorsFromAssemblyContaining<YourModel>()`. 
`YourModel` is the DTO/object sent from the client. Like this we won't have to do validations in the controllers and the validations are done before executing the code for the called endpoint.


## Authentication and authorization
Authentication and authorization are inforced in **Program.cs**, so in order to acces an endpoint you must be authenticated. There are endpoints that must allow unauthenticated users like register, login, etc., you must manually modify the authorization and authentication levels required for your specific use case.

When authenticating a token is returned. The token should be deserialized on the frontend to get the user type. You can check out **Controllers/UserControllers.GenerateJwtToken()** directly to see the token creation logic.

You must add a bearer token for endpoints that require authentication/authorization. 

On the frontend it would look something like this:
- with axios:
```
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://localhost:7051/api/Users',
  headers: {
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjIiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pbiIsImV4cCI6MTc3NDQ3MzE5N30.xICMhjdAekggTYA9F0oVJyR-kS8AlCtfp-r32_h59Dk'
  }
};

try {
  const { data } = await axios.request(options);
  console.log(data);
} catch (error) {
  console.error(error);
}
```

- with fetch:
```
const url = 'https://localhost:7051/api/Users';
const options = {
  method: 'GET',
  headers: {
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjIiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pbiIsImV4cCI6MTc3NDQ3MzE5N30.xICMhjdAekggTYA9F0oVJyR-kS8AlCtfp-r32_h59Dk'
  }
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

- the decoding in the frontend would look something like this, so keep this in mind when decoding:
```
{
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": "2",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin",
  "exp": 1774473197
}
```