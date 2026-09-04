using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize(Roles = "Admin,SalesStaff,Accountant")]
public class CustomersController(FashionFlowDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        // CRM view: orders and lifetime spend come from the Sales module.
        var rows = await db.Customers
            .Select(c => new
            {
                id = c.CustomerId,
                c.Name,
                c.Email,
                spent = db.Sales.Where(s => s.CustomerId == c.CustomerId).Sum(s => (decimal?)s.TotalAmount) ?? 0m,
                points = c.LoyaltyPoints,
                tier = c.Tier
            })
            .OrderByDescending(c => c.spent)
            .ToListAsync();

        // Distinct receipts per customer (orders, not sale lines).
        var ordersByCustomer = await db.Sales
            .Where(s => s.CustomerId != null)
            .GroupBy(s => s.CustomerId)
            .Select(g => new { CustomerId = g.Key!.Value, Orders = g.Select(s => s.ReceiptNo).Distinct().Count() })
            .ToDictionaryAsync(x => x.CustomerId, x => x.Orders);

        return Ok(rows.Select(r => new
        {
            r.id,
            r.Name,
            r.Email,
            orders = ordersByCustomer.TryGetValue(r.id, out var o) ? o : 0,
            spent = r.spent,
            r.points,
            r.tier
        }));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SalesStaff")]
    public async Task<IActionResult> Create(SaveCustomerRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Customers.AnyAsync(c => c.Email == email))
            return Conflict(new { message = "A customer with that email already exists." });

        var customer = new Customer
        {
            Name = req.Name.Trim(),
            Email = email,
            Tier = "Bronze",
            LoyaltyPoints = 0,
            JoinedDate = DateOnly.FromDateTime(DateTime.Today)
        };
        db.Customers.Add(customer);
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Customer registered: {customer.Name} ({customer.Email})", "Sales"));
        await db.SaveChangesAsync();
        return StatusCode(201, new { id = customer.CustomerId, customer.Name });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,SalesStaff")]
    public async Task<IActionResult> Update(int id, SaveCustomerRequest req)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return NotFound(new { message = "Customer not found." });

        customer.Name = req.Name.Trim();
        customer.Email = req.Email.Trim().ToLowerInvariant();
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Customer record updated: {customer.Name}", "Sales"));
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
