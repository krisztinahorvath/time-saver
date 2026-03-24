# TimeSaverAPI

## Info
We are using .NET 10 with EF Core and an MS SQL database.

When running the server a swagger doc will be generated and opened in the browser.

## Useful links
[Entity Framework Core in ASP.NET Core Web API with SQL Server - Dot Net Tutorials](https://dotnettutorials.net/lesson/entity-framework-core-in-asp-net-core-web-api-with-sql-server/)


[Enterprise Web App Patterns - Azure Architecture Center | Microsoft Learn](https://learn.microsoft.com/en-us/azure/architecture/web-apps/guides/enterprise-app-patterns/overview)


[EF Relationships](https://learn.microsoft.com/en-us/ef/core/modeling/relationships)


## Database 

### Setup
Create an MS SQL database and duplicate **template.appsettings.json** and name it **appsettings.json**. Do not delete the template And do not remove **appsettings.json** from *.gitignore*.

Update in **appsettings.json** the `ConnectionString` so that it matches your local database setup - you only need to modify the server and the database. 

### Modifications
We are using an ORM for the database so we won't be writing any SQL queries. You will need to modify the models and the database context appropriately.

To create a migration open the **Package Manager Console** and run this command `Add-Migration <MigrationName>` this will generate the code for updating the database. To perform the actual update run `Update-Database`. 

To remove the last migration use `Remove-Migration`.


## Authentication and authorization
